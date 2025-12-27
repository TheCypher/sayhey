function unwrapLayerAtRule(atRule) {
  if (atRule.nodes && atRule.nodes.length > 0) {
    atRule.replaceWith(...atRule.nodes);
    return;
  }

  atRule.remove();
}

function unlayer() {
  return {
    postcssPlugin: "postcss-unlayer",
    AtRule: {
      layer: unwrapLayerAtRule,
    },
  };
}

unlayer.postcss = true;

module.exports = unlayer;
module.exports.unwrapLayerAtRule = unwrapLayerAtRule;
