import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { Wallet, Download, Shield, Zap, Globe, Lock } from 'lucide-react';
const WelcomeScreen = ({ onNavigate }) => {
    const features = [
        {
            icon: _jsx(Globe, { className: "w-6 h-6" }),
            title: 'Multi-Chain Support',
            description: 'Ethereum, Bitcoin, Solana, TRON, and more'
        },
        {
            icon: _jsx(Shield, { className: "w-6 h-6" }),
            title: 'Advanced Security',
            description: 'Hardware wallet support & encryption'
        },
        {
            icon: _jsx(Zap, { className: "w-6 h-6" }),
            title: 'Lightning Fast',
            description: 'Instant transactions & real-time updates'
        },
        {
            icon: _jsx(Lock, { className: "w-6 h-6" }),
            title: 'Privacy First',
            description: 'Your keys, your crypto, your control'
        }
    ];
    return (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "h-full bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 flex flex-col", children: [_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center px-8 text-center", children: [_jsxs(motion.div, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.6, ease: "easeOut" }, className: "mb-8", children: [_jsx("div", { className: "w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 mx-auto", children: _jsx(Wallet, { className: "w-10 h-10 text-white" }) }), _jsx("h1", { className: "text-4xl font-bold text-white mb-2", children: "SOW Wallet" }), _jsx("p", { className: "text-white/80 text-lg", children: "Your gateway to the decentralized world" })] }), _jsx(motion.div, { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.6, delay: 0.2 }, className: "grid grid-cols-2 gap-4 mb-8 w-full max-w-sm", children: features.map((feature, index) => (_jsxs(motion.div, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.4, delay: 0.3 + index * 0.1 }, className: "bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center", children: [_jsx("div", { className: "text-white/90 mb-2 flex justify-center", children: feature.icon }), _jsx("h3", { className: "text-white font-semibold text-sm mb-1", children: feature.title }), _jsx("p", { className: "text-white/70 text-xs", children: feature.description })] }, feature.title))) })] }), _jsxs(motion.div, { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.6, delay: 0.4 }, className: "p-8 space-y-4", children: [_jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: () => onNavigate('create'), className: "w-full bg-white text-primary-700 font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2", children: [_jsx(Wallet, { className: "w-5 h-5" }), _jsx("span", { children: "Create New Wallet" })] }), _jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: () => onNavigate('import'), className: "w-full bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2", children: [_jsx(Download, { className: "w-5 h-5" }), _jsx("span", { children: "Import Existing Wallet" })] })] }), _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6, delay: 0.6 }, className: "text-center pb-6", children: _jsx("p", { className: "text-white/60 text-sm", children: "By continuing, you agree to our Terms of Service and Privacy Policy" }) })] }));
};
export default WelcomeScreen;
