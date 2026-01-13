import { useState, useEffect, useRef } from 'react';
import { useBrightness } from './hooks/useBrightness';
import { useHueBridge } from './hooks/useHueBridge';
import { HueSetup } from './components/HueSetup';
import { BrightnessSensor } from './components/BrightnessSensor';
import { LightControls } from './components/LightControls';

export type ColorMode = 'spectrum' | 'incandescent';

function App() {
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [hueBrightness, setHueBrightness] = useState(127);
  const [hueColor, setHueColor] = useState(0); // 0-65535
  const [saturation, setSaturation] = useState(254); // 0-254
  const [colorMode, setColorMode] = useState<ColorMode>('spectrum');
  const [colorTemp, setColorTemp] = useState(370); // mirek: ~2700K warm white

  const brightness = useBrightness({ sampleInterval: 500, smoothingFactor: 0.3 });
  const hue = useHueBridge();

  // Track last sent values to avoid redundant updates
  const lastUpdate = useRef({
    bri: hueBrightness,
    hue: hueColor,
    sat: saturation,
    ct: colorTemp,
    mode: colorMode,
  });

  // Auto-adjust lights when ambient brightness changes
  useEffect(() => {
    if (!isAutoMode || !brightness.isActive || hue.status !== 'connected') {
      return;
    }

    // Invert: bright room = dim lights, dark room = bright lights
    const invertedPercent = 1 - brightness.brightness / 255;
    const newHueBrightness = Math.max(1, Math.round(invertedPercent * 254));
    setHueBrightness(newHueBrightness);
  }, [brightness.brightness, brightness.isActive, isAutoMode, hue.status]);

  // Send updates to lights when brightness/color changes
  useEffect(() => {
    if (hue.status !== 'connected') return;

    // Check if anything changed
    const current = lastUpdate.current;
    const modeChanged = current.mode !== colorMode;
    const briChanged = current.bri !== hueBrightness;
    const hueChanged = colorMode === 'spectrum' && (current.hue !== hueColor || current.sat !== saturation);
    const ctChanged = colorMode === 'incandescent' && current.ct !== colorTemp;

    if (!modeChanged && !briChanged && !hueChanged && !ctChanged) {
      return;
    }

    lastUpdate.current = {
      bri: hueBrightness,
      hue: hueColor,
      sat: saturation,
      ct: colorTemp,
      mode: colorMode,
    };

    const timeout = setTimeout(() => {
      if (colorMode === 'spectrum') {
        // HSV color mode
        hue.setLightsState({
          on: true,
          bri: hueBrightness,
          hue: hueColor,
          sat: saturation,
        });
      } else {
        // Color temperature mode
        hue.setLightsState({
          on: true,
          bri: hueBrightness,
          ct: colorTemp,
        });
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [hueBrightness, hueColor, saturation, colorTemp, colorMode, hue.status, hue.setLightsState]);

  // Manual brightness change (when not in auto mode)
  const handleBrightnessChange = (value: number) => {
    if (!isAutoMode) {
      setHueBrightness(value);
    }
  };

  const isConnected = hue.status === 'connected';

  return (
    <div className="app">
      <header>
        <h1>Lightify</h1>
        <p className="tagline">Ambient Illumination Control System</p>
      </header>

      <main>
        {!isConnected ? (
          <HueSetup
            status={hue.status}
            error={hue.error}
            connectionMode={hue.connectionMode}
            relayConfig={hue.relayConfig}
            onConnect={hue.connect}
            onConnectWithRelay={hue.connectWithRelay}
            onSetConnectionMode={hue.setConnectionMode}
            onConfigureRelay={hue.configureRelay}
            onClearRelay={hue.clearRelay}
          />
        ) : (
          <div className="dashboard">
            <BrightnessSensor
              brightness={brightness.brightness}
              isActive={brightness.isActive}
              isGrabbing={brightness.isGrabbing}
              error={brightness.error}
              videoRef={brightness.videoRef}
              onStart={brightness.start}
              onStop={brightness.stop}
              onGrabOnce={brightness.grabOnce}
            />

            <LightControls
              lights={hue.lights}
              selectedLightIds={hue.selectedLightIds}
              hueBrightness={hueBrightness}
              hueColor={hueColor}
              saturation={saturation}
              colorMode={colorMode}
              colorTemp={colorTemp}
              isAutoMode={isAutoMode}
              onToggleLight={hue.toggleLightSelection}
              onSelectAll={hue.selectAllLights}
              onToggleAutoMode={() => setIsAutoMode(!isAutoMode)}
              onBrightnessChange={handleBrightnessChange}
              onHueColorChange={setHueColor}
              onSaturationChange={setSaturation}
              onColorModeChange={setColorMode}
              onColorTempChange={setColorTemp}
              onDisconnect={hue.disconnect}
            />
          </div>
        )}
      </main>

      <footer>
        <p>
          {isConnected && hue.bridgeIp && (
            <span className="connected-status">
              {hue.connectionMode === 'relay' ? '[RELAY] ' : ''}{hue.bridgeIp}
            </span>
          )}
        </p>
      </footer>
    </div>
  );
}

export default App;
