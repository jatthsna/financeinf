import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA & Security Configurations', () => {
  it('validates public manifest.json properties', () => {
    const manifestPath = path.resolve(__dirname, '../../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(content.name).toContain('KAS INFORMATIKA');
    expect(content.theme_color).toBe('#174C3C');
    expect(content.background_color).toBe('#F7F7F4');
    expect(content.display).toBe('standalone');
  });

  it('validates offline fallback page existence', () => {
    const offlinePath = path.resolve(__dirname, '../../public/offline.html');
    expect(fs.existsSync(offlinePath)).toBe(true);

    const htmlContent = fs.readFileSync(offlinePath, 'utf-8');
    expect(htmlContent).toContain('KAS INFORMATIKA');
    expect(htmlContent).toContain('Offline');
  });
});
