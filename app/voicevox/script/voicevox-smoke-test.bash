#!/usr/bin/env bash
set -euo pipefail

for cmd in aws curl jq; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "required command not found: $cmd" >&2
    exit 1
  }
done

STACK_NAME="${STACK_NAME:-toybox-voicevox-runtime}"
PROFILE="${PROFILE:-poc-ops}"
REGION="${REGION:-us-west-2}"
SPEAKER="${SPEAKER:-1}"
TEXT="${TEXT:-テスト成功なのだ}"
WORKDIR="${WORKDIR:-/tmp/voicevox-test}"
HTTP_TIMEOUT_SECONDS="${HTTP_TIMEOUT_SECONDS:-60}"

BASE_URL="${BASE_URL:-$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey==\`FunctionUrl\`].OutputValue" \
  --output text \
  --region "${REGION}" \
  --profile "${PROFILE}")}"

BASE_URL="${BASE_URL%/}"

if [[ -z "${BASE_URL}" || "${BASE_URL}" == "None" ]]; then
  echo "FunctionUrl output が取得できませんでした: ${STACK_NAME}" >&2
  exit 1
fi

mkdir -p "${WORKDIR}"

CREDS_JSON="${WORKDIR}/aws-credentials.json"
QUERY_JSON="${WORKDIR}/query.json"
WAV_FILE="${WORKDIR}/voice.wav"

aws configure export-credentials \
  --profile "${PROFILE}" \
  --format process \
  > "${CREDS_JSON}"

AWS_ACCESS_KEY_ID="$(jq -r '.AccessKeyId' "${CREDS_JSON}")"
AWS_SECRET_ACCESS_KEY="$(jq -r '.SecretAccessKey' "${CREDS_JSON}")"
AWS_SESSION_TOKEN="$(jq -r '.SessionToken // empty' "${CREDS_JSON}")"

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_SESSION_TOKEN

curl_iam() {
  local method="$1"
  local url="$2"
  shift 2

  local headers=()
  if [[ -n "${AWS_SESSION_TOKEN}" ]]; then
    headers=(-H "X-Amz-Security-Token: ${AWS_SESSION_TOKEN}")
  fi

  curl -sfS \
    --max-time "${HTTP_TIMEOUT_SECONDS}" \
    --aws-sigv4 "aws:amz:${REGION}:lambda" \
    --user "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" \
    "${headers[@]}" \
    -X "${method}" \
    "$@" \
    "${url}"
}

echo "BASE_URL: ${BASE_URL}"
if curl_iam GET "${BASE_URL}/health" >/dev/null 2>&1; then
  curl_iam GET "${BASE_URL}/health" | jq .
else
  echo "/health は未提供（VOICEVOX では通常想定）"
fi
if ! curl_iam GET "${BASE_URL}/version"; then
  echo >&2
  echo "VOICEVOX の /version が失敗しました。直近ログを確認してください:" >&2
  echo "aws logs tail /aws/lambda/${STACK_NAME} --since 5m --region ${REGION} --profile ${PROFILE} --format short" >&2
  exit 1
fi
echo
if ! curl_iam POST \
  "${BASE_URL}/audio_query?speaker=${SPEAKER}" \
  --get \
  --data-urlencode "text=${TEXT}" \
  -o "${QUERY_JSON}"; then
  echo "VOICEVOX API に接続できません。/audio_query の応答を確認してください。" >&2
  exit 1
fi

curl_iam POST \
  "${BASE_URL}/synthesis?speaker=${SPEAKER}" \
  -H "Content-Type: application/json" \
  --data-binary @"${QUERY_JSON}" \
  -o "${WAV_FILE}"

echo "WAV: ${WAV_FILE}"
if command -v powershell.exe >/dev/null 2>&1 && command -v wslpath >/dev/null 2>&1; then
  WIN_PATH="$(wslpath -w "${WAV_FILE}")"
  powershell.exe -NoProfile -NonInteractive -Command \
    "\$p=New-Object System.Media.SoundPlayer '${WIN_PATH}'; \$p.PlaySync()"
elif command -v aplay >/dev/null 2>&1; then
  aplay "${WAV_FILE}"
elif command -v ffplay >/dev/null 2>&1; then
  ffplay -nodisp -autoexit "${WAV_FILE}"
else
  echo "音声再生コマンドが見つからないため保存のみ: ${WAV_FILE}"
fi
