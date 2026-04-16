declare module 'qrcode' {
  export type QRCodeErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

  export interface QRCodeToStringOptions {
    type?: 'svg' | 'utf8' | 'terminal';
    margin?: number;
    errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  const QRCode: {
    toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  };

  export default QRCode;
}
