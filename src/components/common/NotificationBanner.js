import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
const NotificationBanner = ({ notification, onClose }) => {
    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return _jsx(CheckCircle, { className: "w-5 h-5 text-green-500" });
            case 'error':
                return _jsx(AlertCircle, { className: "w-5 h-5 text-red-500" });
            case 'warning':
                return _jsx(AlertTriangle, { className: "w-5 h-5 text-yellow-500" });
            case 'info':
                return _jsx(Info, { className: "w-5 h-5 text-blue-500" });
            default:
                return _jsx(Info, { className: "w-5 h-5 text-blue-500" });
        }
    };
    const getBackgroundColor = (type) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            case 'info':
                return 'bg-blue-50 border-blue-200';
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };
    const getTextColor = (type) => {
        switch (type) {
            case 'success':
                return 'text-green-800';
            case 'error':
                return 'text-red-800';
            case 'warning':
                return 'text-yellow-800';
            case 'info':
                return 'text-blue-800';
            default:
                return 'text-blue-800';
        }
    };
    return (_jsx(AnimatePresence, { children: notification && (_jsx(motion.div, { initial: { y: -100, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -100, opacity: 0 }, className: `fixed top-0 left-0 right-0 z-50 p-4 border-b ${getBackgroundColor(notification.type)}`, children: _jsxs("div", { className: "max-w-md mx-auto flex items-start space-x-3", children: [getIcon(notification.type), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: `text-sm font-medium ${getTextColor(notification.type)}`, children: notification.title }), _jsx("p", { className: `text-sm ${getTextColor(notification.type)} opacity-90`, children: notification.message })] }), _jsx(motion.button, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, onClick: onClose, className: `p-1 rounded-lg transition-colors ${getTextColor(notification.type)} opacity-70 hover:opacity-100`, children: _jsx(X, { className: "w-4 h-4" }) })] }) })) }));
};
export default NotificationBanner;
