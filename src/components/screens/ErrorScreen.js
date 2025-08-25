import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
const ErrorScreen = ({ error = 'Something went wrong', onRetry }) => {
    return (_jsx("div", { className: "h-full bg-gray-50 flex items-center justify-center p-6", children: _jsxs("div", { className: "text-center max-w-sm", children: [_jsx(motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, className: "w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx(AlertTriangle, { className: "w-8 h-8 text-red-600" }) }), _jsx("h2", { className: "text-xl font-bold text-gray-900 mb-2", children: "Oops!" }), _jsx("p", { className: "text-gray-600 mb-6", children: error }), onRetry && (_jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: onRetry, className: "inline-flex items-center space-x-2 bg-primary-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:bg-primary-700 transition-colors", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), _jsx("span", { children: "Try Again" })] }))] }) }));
};
export default ErrorScreen;
