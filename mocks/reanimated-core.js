// Minimal jest stand-in for react-native-reanimated.
// The shipped mock (react-native-reanimated/mock) requires ./src/mock, which
// is not part of the installed v4 package, so tests would crash without this.
/* eslint-disable */
const React = require('react');
const { View, Pressable } = require('react-native');

function useSharedValue(initial) {
  const ref = React.useRef({ value: initial });
  return ref.current;
}

function useAnimatedStyle(buildStyle) {
  // No animation clock in tests: just evaluate the style once per render.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => setTick((n) => n + 1), []);
  return buildStyle();
}

// The mock has no clock: animations resolve instantly, so the completion callback
// (when given) fires synchronously with finished=true.
function withTiming(target, _config, callback) {
  if (callback) callback(true);
  return target;
}
function withSpring(target, _config, callback) {
  if (callback) callback(true);
  return target;
}
function withDelay(_ms, value) {
  return value;
}
function withSequence(..._values) {
  return undefined;
}

// On the JS thread, runOnJS is a passthrough.
function runOnJS(fn) {
  return fn;
}

function AnimatedComponent(Component) {
  const Wrapper = React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));
  Wrapper.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
  return Wrapper;
}

// Entering animations are declared as a chain (FadeInRight.duration(250)).
// Nothing animates under jest, so every link in the chain returns the same
// inert spec and the prop is ignored by the component stubs above.
function animationSpec() {
  const spec = {};
  for (const method of ['duration', 'delay', 'springDamping', 'damping', 'property']) {
    spec[method] = () => spec;
  }
  return spec;
}

// expo-router's testing-library does `Reanimated.default.call = () => {}`, so the
// default must be an extensible object or function (forwardRef results are frozen).
function Animated() {
  return React.createElement(View);
}
Animated.View = AnimatedComponent(View);
Animated.ScrollView = AnimatedComponent(View);
Animated.FlatList = View;
Animated.Text = AnimatedComponent(require('react-native').Text);
Animated.Image = AnimatedComponent(require('react-native').Image);
Animated.createAnimatedComponent = AnimatedComponent;
Animated.useChildAnimation = () => ({});

module.exports = {
  __esModule: true,
  default: Animated,
  Animated,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps: (fn) => fn(),
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedRef: () => React.createRef(),
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  LinearTransition: {},
  CurvedTransition: {},
  Keyframe: class {},
  FadeIn: animationSpec(),
  FadeInLeft: animationSpec(),
  FadeInRight: animationSpec(),
  Easing: { linear: (n) => n, ease: (n) => n, quad: (n) => n },
};
