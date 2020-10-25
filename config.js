export default {
  major: [
    /^major:/i,
    /^breaking(?: change)?:/i,
  ],
  minor: [
    /^minor:/i,
    /^feat(?:ure)?:/i
  ],
  patch: [
    /^patch:/i,
    /^fix:/i
  ]
};
