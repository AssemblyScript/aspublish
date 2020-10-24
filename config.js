export default {
  major: [
    /^breaking(?: change):/i
  ],
  minor: [
    /^feat(?:ure)?:/i
  ],
  patch: [
    /^(?:fix|patch):/i
  ]
};
