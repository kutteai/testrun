import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
const LoadingScreen = ({ message = 'Loading...' }) => {
    return (_jsx("div", { className: "h-full bg-gray-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(motion.div, { animate: { rotate: 360 }, transition: { duration: 1, repeat: Infinity, ease: 'linear' }, className: "w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 font-medium", children: message })] }) }));
};
export default LoadingScreen;
