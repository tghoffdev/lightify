import { HueLight } from '../utils/hueApi';
import { ColorMode } from '../App';

// Temperature presets in Kelvin
const TEMP_PRESETS = [
  { name: 'Candle', kelvin: 1800 },
  { name: 'Warm', kelvin: 2700 },
  { name: 'Soft', kelvin: 3000 },
  { name: 'Neutral', kelvin: 4000 },
  { name: 'Daylight', kelvin: 5000 },
  { name: 'Cool', kelvin: 6500 },
];

// Convert Kelvin to Mirek (what Hue API uses)
const kelvinToMirek = (kelvin: number): number => {
  const mirek = Math.round(1000000 / kelvin);
  return Math.max(153, Math.min(500, mirek));
};

// Convert Mirek to Kelvin (for display)
const mirekToKelvin = (mirek: number): number => {
  return Math.round(1000000 / mirek);
};

interface LightControlsProps {
  lights: HueLight[];
  selectedLightIds: string[];
  hueBrightness: number;
  hueColor: number;
  saturation: number;
  colorMode: ColorMode;
  colorTemp: number; // mirek value
  isAutoMode: boolean;
  onToggleLight: (lightId: string) => void;
  onSelectAll: () => void;
  onToggleAutoMode: () => void;
  onBrightnessChange: (value: number) => void;
  onHueColorChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onColorModeChange: (mode: ColorMode) => void;
  onColorTempChange: (temp: number) => void;
  onDisconnect: () => void;
}

export function LightControls({
  lights,
  selectedLightIds,
  hueBrightness,
  hueColor,
  saturation,
  colorMode,
  colorTemp,
  isAutoMode,
  onToggleLight,
  onSelectAll,
  onToggleAutoMode,
  onBrightnessChange,
  onHueColorChange,
  onSaturationChange,
  onColorModeChange,
  onColorTempChange,
  onDisconnect,
}: LightControlsProps) {
  const hueBrightnessPercent = Math.round((hueBrightness / 254) * 100);
  // Convert Hue's 0-65535 range to CSS hue 0-360
  const cssHue = Math.round((hueColor / 65535) * 360);
  const cssSaturation = Math.round((saturation / 254) * 100);
  // Convert mirek to Kelvin for display
  const kelvinValue = mirekToKelvin(colorTemp);

  // Handle Kelvin slider change - convert from slider range to mirek
  const handleTempSliderChange = (kelvin: number) => {
    onColorTempChange(kelvinToMirek(kelvin));
  };

  return (
    <div className="light-controls panel">
      <div className="panel-header">
        <h3>Illumination Control</h3>
        <div className="status-indicator" style={{
          background: 'var(--success)',
          boxShadow: '0 0 8px var(--success)'
        }} />
      </div>
      <div className="panel-content">
        <div className="section-header">
          <h3>Active Units</h3>
          <button onClick={onDisconnect} className="btn-text">
            Disconnect
          </button>
        </div>

        <div className="lights-list">
          {lights.map(light => (
            <label key={light.id} className="light-item">
              <input
                type="checkbox"
                checked={selectedLightIds.includes(light.id)}
                onChange={() => onToggleLight(light.id)}
              />
              <span className="light-name">{light.name}</span>
              <span className={`light-status ${light.state.reachable ? 'online' : 'offline'}`}>
                {light.state.reachable ? 'Online' : 'Offline'}
              </span>
            </label>
          ))}
        </div>

        {lights.length > 1 && (
          <button onClick={onSelectAll} className="btn-text">
            Select All Units
          </button>
        )}

        <div className="meter" style={{ marginTop: '1.5rem' }}>
          <div className="meter-label">
            <span>Output Level</span>
            <span>{hueBrightnessPercent}%</span>
          </div>
          <div className="meter-bar">
            <div
              className="meter-fill output"
              style={{ width: `${hueBrightnessPercent}%` }}
            />
          </div>
        </div>

        <div className="control-group">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isAutoMode}
              onChange={onToggleAutoMode}
            />
            <span className="toggle-track" />
            <span className="toggle-label">
              {isAutoMode ? 'Auto-Adjust Active' : 'Auto-Adjust Disabled'}
            </span>
          </label>
        </div>

        {/* Color Mode Toggle */}
        <div className="color-mode-toggle">
          <button
            className={`color-mode-btn ${colorMode === 'spectrum' ? 'active' : ''}`}
            onClick={() => onColorModeChange('spectrum')}
          >
            Spectrum
          </button>
          <button
            className={`color-mode-btn ${colorMode === 'incandescent' ? 'active' : ''}`}
            onClick={() => onColorModeChange('incandescent')}
          >
            Incandescent
          </button>
        </div>

        {/* Spectrum Mode Controls */}
        {colorMode === 'spectrum' && (
          <>
            <div className="color-control">
              <label>Color Spectrum</label>
              <div className="color-wheel">
                <input
                  type="range"
                  className="hue-slider"
                  min="0"
                  max="65535"
                  value={hueColor}
                  onChange={e => onHueColorChange(Number(e.target.value))}
                />
                <div
                  className="color-preview"
                  style={{ background: `hsl(${cssHue}, ${cssSaturation}%, 50%)` }}
                />
              </div>
            </div>

            <div className="slider-control">
              <label>
                <span>Saturation</span>
                <span>{cssSaturation}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="254"
                value={saturation}
                onChange={e => onSaturationChange(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, hsl(${cssHue}, 0%, 50%), hsl(${cssHue}, 100%, 50%))`
                }}
              />
            </div>
          </>
        )}

        {/* Incandescent Mode Controls */}
        {colorMode === 'incandescent' && (
          <>
            <div className="color-control">
              <label>
                <span>Color Temperature</span>
                <span className="kelvin-value">{kelvinValue}K</span>
              </label>
              <input
                type="range"
                className="temp-slider"
                min="1800"
                max="6500"
                value={kelvinValue}
                onChange={e => handleTempSliderChange(Number(e.target.value))}
              />
            </div>

            <div className="temp-presets">
              {TEMP_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  className={`temp-preset-btn ${kelvinValue === preset.kelvin ? 'active' : ''}`}
                  onClick={() => onColorTempChange(kelvinToMirek(preset.kelvin))}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="slider-control">
          <label>
            <span>Output</span>
            <span>{hueBrightnessPercent}%</span>
          </label>
          <input
            type="range"
            min="1"
            max="254"
            value={hueBrightness}
            onChange={e => onBrightnessChange(Number(e.target.value))}
            disabled={isAutoMode}
            style={{ opacity: isAutoMode ? 0.5 : 1 }}
          />
        </div>
      </div>
    </div>
  );
}
