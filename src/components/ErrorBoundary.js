import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch() {
        // Log error to service in production
        // In a real app, you would send this to an error reporting service
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-2", children: "Something went wrong" }), _jsx("button", { onClick: () => this.setState({ hasError: false }), className: "px-4 py-2 bg-primary-500 text-white rounded-lg", children: "Try again" })] }) }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
