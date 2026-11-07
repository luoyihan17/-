import ParticleTextOriginal from './ParticleTextOriginal';
import WaterfallText from './WaterfallText';

/** React Bits ParticleText, with an opt-in continuous waterfall renderer. */
export default function ParticleText({ mode = 'original', ...props }) {
  return mode === 'waterfall' ? <WaterfallText {...props} /> : <ParticleTextOriginal {...props} />;
}
