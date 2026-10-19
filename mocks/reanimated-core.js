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

function withTiming(target) {
  return target;
}
function withSpring(target) {
  return target;
}
function withDelay(_ms, value) {
  return value;
}
function withSequence(..._values) {
  return undefined;
}

function AnimatedComponent(Component) {
  const Wrapper = React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));
  Wrapper.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
  return Wrapper;
}

// Entering animations are declared as a chain (SlideInRight.duration(250)).
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
  LinearTransition: {},
  CurvedTransition: {},
  Keyframe: class {},
  FadeIn: animationSpec(),
  SlideInLeft: animationSpec(),
  SlideInRight: animationSpec(),
  Easing: { linear: (n) => n, ease: (n) => n, quad: (n) => n },
};
