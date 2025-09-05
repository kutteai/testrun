import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Share2, Download, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../../store/WalletContext';
import toast from 'react-hot-toast';
const ReceiveScreen = ({ onNavigate }) => {
    const { wallet, currentNetwork } = useWallet();
    const [copied, setCopied] = useState(false);
    const [qrSize, setQrSize] = useState(200);
    // Generate QR code data for wallet address
    const getQRCodeData = () => {
        if (!wallet?.address)
            return '';
        // Create a proper QR code data string for cryptocurrency addresses
        // This includes the network prefix for better wallet compatibility
        const networkPrefix = currentNetwork?.symbol?.toLowerCase() || 'eth';
        return `${networkPrefix}:${wallet.address}`;
    };
    useEffect(() => {
        if (wallet?.address) {
            setQrSize(200); // Ensure QR size is 200 for qrcode.react
        }
    }, [wallet?.address, currentNetwork?.symbol]);
    const copyAddress = async () => {
        if (!wallet?.address)
            return;
        try {
            await navigator.clipboard.writeText(wallet.address);
            setCopied(true);
            toast.success('Address copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            toast.error('Failed to copy address');
        }
    };
    const downloadQRCode = () => {
        if (!wallet?.address)
            return;
        // Create a canvas element to render the QR code
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        canvas.width = 200;
        canvas.height = 200;
        // For now, create a simple QR-like pattern
        // In a production app, you'd use a proper QR code library
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#fff';
        ctx.fillRect(10, 10, 180, 180);
        ctx.fillStyle = '#000';
        ctx.fillRect(20, 20, 160, 160);
        // Add the address text
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PayCio Address', 100, 190);
        // Download
        const link = document.createElement('a');
        link.download = 'paycio-address-qr.png';
        link.href = canvas.toDataURL();
        link.click();
    };
    const shareAddress = async () => {
        if (!wallet?.address)
            return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'PayCio Wallet Address',
                    text: `My PayCio wallet address: ${wallet.address}`,
                    url: `ethereum:${wallet.address}`
                });
            }
            catch {
                console.log('Share cancelled');
            }
        }
        else {
            // Fallback to copy
            copyAddress();
        }
    };
    if (!wallet?.address) {
        return (_jsx("div", { className: "h-full bg-gray-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-gray-500 mb-4", children: "No wallet found" }), _jsx("button", { onClick: () => onNavigate('dashboard'), className: "px-4 py-2 bg-primary-600 text-white rounded-lg", children: "Go to Dashboard" })] }) }));
    }
    return (_jsxs("div", { className: "h-full bg-gray-50", children: [_jsx("div", { className: "px-4 py-3 bg-white border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("button", { onClick: () => onNavigate('dashboard'), className: "p-2 rounded-lg hover:bg-gray-100", children: _jsx(ArrowLeft, { className: "w-5 h-5 text-gray-600" }) }), _jsx("h1", { className: "text-lg font-semibold text-gray-900", children: "Receive ETH" }), _jsx("div", { className: "w-9" })] }) }), _jsxs("div", { className: "p-4 space-y-6", children: [_jsxs("div", { className: "p-6 bg-white rounded-xl text-center", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Your Address" }), _jsx("p", { className: "text-sm text-gray-600", children: "Share this address to receive ETH and other ERC-20 tokens" })] }), _jsx("div", { className: "mx-auto mb-4 w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300", children: _jsx(QRCodeSVG, { value: getQRCodeData(), size: qrSize }) }), _jsxs("div", { className: "p-3 bg-gray-50 rounded-lg mb-4", children: [_jsx("div", { className: "text-sm text-gray-600 mb-1", children: "Wallet Address" }), _jsx("div", { className: "font-mono text-sm text-gray-900 break-all", children: wallet.address })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: copyAddress, className: "flex flex-col items-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors", children: [copied ? (_jsx(Check, { className: "w-5 h-5 text-green-600 mb-1" })) : (_jsx(Copy, { className: "w-5 h-5 text-blue-600 mb-1" })), _jsx("span", { className: "text-xs text-gray-700", children: copied ? 'Copied!' : 'Copy' })] }), _jsxs(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: downloadQRCode, className: "flex flex-col items-center p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors", children: [_jsx(Download, { className: "w-5 h-5 text-green-600 mb-1" }), _jsx("span", { className: "text-xs text-gray-700", children: "Download" })] }), _jsxs(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: shareAddress, className: "flex flex-col items-center p-3 rounded-lg bg-[#180CB2]/10 hover:bg-[#180CB2]/20 transition-colors", children: [_jsx(Share2, { className: "w-5 h-5 text-[#180CB2] mb-1" }), _jsx("span", { className: "text-xs text-gray-700", children: "Share" })] })] })] }), _jsxs("div", { className: "p-4 bg-blue-50 rounded-xl", children: [_jsx("h3", { className: "font-semibold text-blue-900 mb-2", children: "How to receive ETH" }), _jsxs("ul", { className: "text-sm text-blue-800 space-y-1", children: [_jsx("li", { children: "\u2022 Share your address with the sender" }), _jsx("li", { children: "\u2022 They can scan the QR code or copy the address" }), _jsx("li", { children: "\u2022 Transactions typically confirm in 1-3 minutes" }), _jsx("li", { children: "\u2022 You'll see the balance update automatically" })] })] }), _jsxs("div", { className: "p-4 bg-yellow-50 rounded-xl", children: [_jsx("h3", { className: "font-semibold text-yellow-900 mb-2", children: "Security Tips" }), _jsxs("ul", { className: "text-sm text-yellow-800 space-y-1", children: [_jsx("li", { children: "\u2022 Only share this address with trusted sources" }), _jsx("li", { children: "\u2022 Double-check the address before sharing" }), _jsx("li", { children: "\u2022 Never share your private key or seed phrase" }), _jsx("li", { children: "\u2022 This address is safe to share publicly" })] })] })] })] }));
};
export default ReceiveScreen;
