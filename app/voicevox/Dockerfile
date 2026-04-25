FROM voicevox/voicevox_engine:cpu-amd64-latest

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.0-x86_64 /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /opt/voicevox_engine
ENV AWS_LWA_PORT=50021

# Override ENTRYPOINT and CMD to bypass `gosu user` (not available in Lambda runtime user context).
# Base image ENTRYPOINT is /entrypoint.sh and CMD is `gosu user /opt/voicevox_engine/run --host 0.0.0.0`.
# Lambda does not support gosu, so run the compiled binary directly.
ENTRYPOINT []
CMD [ "/opt/voicevox_engine/run", "--host", "0.0.0.0", "--port", "50021" ]
