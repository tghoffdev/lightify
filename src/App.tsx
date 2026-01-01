import { useState, useEffect, useRef } from 'react';
import { useBrightness } from './hooks/useBrightness';
import { useHueBridge } from './hooks/useHueBridge';
import { HueSetup } from './components/HueSetup';
import { WebcamPreview } from './components/WebcamPreview';
import { LightControls } from './components/LightControls';

function App() {
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [hueBrightness, setHueBrightness] = useState(127);
  const [hueColor, setHueColor] = useState(0); // 0-65535
  const [saturation, setSaturation] = useState(254); // 0-254

  const brightness = useBrightness({ sampleInterval: 500, smoothingFactor: 0.3 });
  const hue = useHueBridge();

  // Track last sent values to avoid redundant updates
  const lastUpdate = useRef({ bri: hueBrightness, hue: hueColor, sat: saturation });

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
    if (
      lastUpdate.current.bri === hueBrightness &&
      lastUpdate.current.hue === hueColor &&
      lastUpdate.current.sat === saturation
    ) {
      return;
    }

    lastUpdate.current = { bri: hueBrightness, hue: hueColor, sat: saturation };

    const timeout = setTimeout(() => {
      hue.setLightsState({
        on: true,
        bri: hueBrightness,
        hue: hueColor,
        sat: saturation,
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, [hueBrightness, hueColor, saturation, hue.status, hue.setLightsState]);

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
            onConnect={hue.connect}
          />
        ) : (
          <div className="dashboard">
            <WebcamPreview
              videoRef={brightness.videoRef}
              brightness={brightness.brightness}
              isActive={brightness.isActive}
              error={brightness.error}
              onStart={brightness.start}
              onStop={brightness.stop}
            />

            <LightControls
              lights={hue.lights}
              selectedLightIds={hue.selectedLightIds}
              hueBrightness={hueBrightness}
              hueColor={hueColor}
              saturation={saturation}
              isAutoMode={isAutoMode}
              onToggleLight={hue.toggleLightSelection}
              onSelectAll={hue.selectAllLights}
              onToggleAutoMode={() => setIsAutoMode(!isAutoMode)}
              onBrightnessChange={handleBrightnessChange}
              onHueColorChange={setHueColor}
              onSaturationChange={setSaturation}
              onDisconnect={hue.disconnect}
            />
          </div>
        )}
      </main>

      <footer>
        <p>
          {isConnected && hue.bridgeIp && (
            <span className="connected-status">
              {hue.bridgeIp}
            </span>
          )}
        </p>
      </footer>
    </div>
  );
}

export default App;
