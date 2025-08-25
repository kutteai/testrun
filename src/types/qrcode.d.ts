declare module 'qrcode.react' {
  import { Component } from 'react';
  
  interface QRCodeSVGProps {
    value: string;
    size?: number;
    level?: string;
    bgColor?: string;
    fgColor?: string;
    style?: React.CSSProperties;
    includeMargin?: boolean;
  }
  
  export class QRCodeSVG extends Component<QRCodeSVGProps> {}
}
