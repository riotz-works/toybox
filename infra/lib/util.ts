const toKebabCase = (str: string,): string => str.
  replace(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, '$<lower>-$<upper>',).
  replace(/(?<upper1>[A-Z])(?<upper2>[A-Z][a-z])/gu, '$<upper1>-$<upper2>',).
  toLowerCase();


export { toKebabCase, };
