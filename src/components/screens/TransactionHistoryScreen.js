import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTransaction } from '../../store/TransactionContext';
import { useWallet } from '../../store/WalletContext';
import { getTransactionHistory, getTokenTransactions } from '../../utils/web3-utils';
import toast from 'react-hot-toast';
const TransactionHistoryScreen = ({ onNavigate }) => {
    const { recentTransactions, pendingTransactions, refreshTransactions } = useTransaction();
    const { wallet, currentNetwork } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [allTransactions, setAllTransactions] = useState([]);
    const [blockchainTransactions, setBlockchainTransactions] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showDetails, setShowDetails] = useState({});
    // Combine recent and pending transactions
    useEffect(() => {
        const combined = [...pendingTransactions, ...recentTransactions, ...blockchainTransactions];
        setAllTransactions(combined);
    }, [recentTransactions, pendingTransactions, blockchainTransactions]);
    // Load transactions from blockchain
    const loadBlockchainTransactions = async (pageNum = 1, append = false) => {
        if (!wallet?.address || !currentNetwork) {
            setError('No wallet or network selected');
            return;
        }
        if (pageNum === 1) {
            setIsLoading(true);
        }
        else {
            setIsLoadingMore(true);
        }
        setError(null);
        try {
            // Load both regular and token transactions
            const [regularTxs, tokenTxs] = await Promise.all([
                getTransactionHistory(wallet.address, currentNetwork.id, pageNum, 20),
                getTokenTransactions(wallet.address, currentNetwork.id)
            ]);
            // Convert blockchain transactions to our format
            const formattedTransactions = [...regularTxs, ...tokenTxs].map((tx) => ({
                id: tx.hash || tx.transactionHash,
                hash: tx.hash || tx.transactionHash,
                from: tx.from,
                to: tx.to,
                value: tx.value ? (parseInt(tx.value) / 1e18).toString() : '0',
                network: currentNetwork.id,
                status: tx.confirmations > 0 ? 'confirmed' : 'pending',
                timestamp: parseInt(tx.timeStamp || tx.timestamp) * 1000,
                gasUsed: tx.gasUsed,
                gasPrice: tx.gasPrice ? (parseInt(tx.gasPrice) / 1e9).toString() : '0',
                blockNumber: tx.blockNumber,
                confirmations: tx.confirmations || 0,
                isTokenTransaction: !!tx.tokenName,
                tokenName: tx.tokenName,
                tokenSymbol: tx.tokenSymbol,
                tokenValue: tx.tokenValue
            }));
            if (append) {
                setBlockchainTransactions(prev => [...prev, ...formattedTransactions]);
            }
            else {
                setBlockchainTransactions(formattedTransactions);
            }
            // Check if there are more transactions
            setHasMore(formattedTransactions.length === 20);
            setPage(pageNum);
            if (pageNum === 1) {
                toast.success('Transactions refreshed');
            }
        }
        catch (error) {
            console.error('Error loading transactions:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load transactions';
            setError(errorMessage);
            toast.error(errorMessage);
        }
        finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };
    // Load more transactions
    const loadMore = () => {
        if (!isLoadingMore && hasMore) {
            loadBlockchainTransactions(page + 1, true);
        }
    };
    // Refresh transactions
    const handleRefresh = () => {
        setPage(1);
        setHasMore(true);
        loadBlockchainTransactions(1, false);
    };
    // Toggle transaction details
    const toggleDetails = (transactionId) => {
        setShowDetails(prev => ({
            ...prev,
            [transactionId]: !prev[transactionId]
        }));
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'confirmed':
                return _jsx(CheckCircle, { className: "w-4 h-4 text-green-500" });
            case 'pending':
                return _jsx(Clock, { className: "w-4 h-4 text-yellow-500" });
            case 'failed':
                return _jsx(XCircle, { className: "w-4 h-4 text-red-500" });
            default:
                return _jsx(Clock, { className: "w-4 h-4 text-gray-500" });
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return 'text-green-600 bg-green-50';
            case 'pending':
                return 'text-yellow-600 bg-yellow-50';
            case 'failed':
                return 'text-red-600 bg-red-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };
    const formatAddress = (address) => {
        if (!address)
            return 'Unknown';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };
    const formatTime = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (days > 0)
            return `${days}d ago`;
        if (hours > 0)
            return `${hours}h ago`;
        if (minutes > 0)
            return `${minutes}m ago`;
        return 'Just now';
    };
    const formatValue = (value, isToken = false, tokenSymbol) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue))
            return '0';
        if (isToken && tokenSymbol) {
            return `${numValue.toFixed(4)} ${tokenSymbol}`;
        }
        return `${numValue.toFixed(4)} ETH`;
    };
    const openExplorer = (hash) => {
        const explorerUrl = currentNetwork?.explorerUrl || 'https://etherscan.io';
        window.open(`${explorerUrl}/tx/${hash}`, '_blank');
    };
    return (_jsxs("div", { className: "h-full bg-gray-50", children: [_jsx("div", { className: "px-4 py-3 bg-white border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("button", { onClick: () => onNavigate('dashboard'), className: "p-2 rounded-lg hover:bg-gray-100", children: _jsx(ArrowLeft, { className: "w-5 h-5 text-gray-600" }) }), _jsx("h1", { className: "text-lg font-semibold text-gray-900", children: "Transaction History" }), _jsx(motion.button, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, onClick: handleRefresh, disabled: isLoading, className: "p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50", children: _jsx(RefreshCw, { className: `w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}` }) })] }) }), error && (_jsx("div", { className: "px-4 py-3 bg-red-50 border-b border-red-200", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-500" }), _jsx("span", { className: "text-red-700 text-sm", children: error })] }) })), _jsx("div", { className: "p-4", children: isLoading && allTransactions.length === 0 ? (_jsxs("div", { className: "py-12 text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading transactions..." })] })) : allTransactions.length === 0 ? (_jsxs("div", { className: "py-12 text-center", children: [_jsx("div", { className: "flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full", children: _jsx(Clock, { className: "w-8 h-8 text-gray-400" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No Transactions" }), _jsx("p", { className: "text-gray-600 mb-4", children: "You haven't made any transactions yet." }), _jsx("button", { onClick: handleRefresh, disabled: isLoading, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50", children: isLoading ? 'Loading...' : 'Load Transactions' })] })) : (_jsxs("div", { className: "space-y-3", children: [allTransactions.map((transaction) => (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "p-4 bg-white rounded-xl shadow-sm", children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [getStatusIcon(transaction.status), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-900", children: transaction.isTokenTransaction ? 'Token Transfer' : 'Transaction' }), _jsx("div", { className: "text-sm text-gray-500", children: formatTime(transaction.timestamp) })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: () => openExplorer(transaction.hash), className: "p-1 rounded hover:bg-gray-100", title: "View on Explorer", children: _jsx(ExternalLink, { className: "w-4 h-4 text-gray-500" }) }), _jsx("button", { onClick: () => toggleDetails(transaction.id), className: "p-1 rounded hover:bg-gray-100", title: "Toggle Details", children: showDetails[transaction.id] ? (_jsx(ChevronUp, { className: "w-4 h-4 text-gray-500" })) : (_jsx(ChevronDown, { className: "w-4 h-4 text-gray-500" })) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Amount:" }), _jsx("span", { className: "font-medium text-gray-900", children: formatValue(transaction.value, transaction.isTokenTransaction, transaction.tokenSymbol) })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Status:" }), _jsx("span", { className: `px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`, children: transaction.status })] })] }), showDetails[transaction.id] && (_jsxs(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, className: "mt-3 pt-3 border-t border-gray-100 space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "From:" }), _jsx("span", { className: "font-mono text-gray-900", children: formatAddress(transaction.from) })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "To:" }), _jsx("span", { className: "font-mono text-gray-900", children: formatAddress(transaction.to) })] }), transaction.blockNumber && (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Block:" }), _jsx("span", { className: "text-gray-900", children: parseInt(transaction.blockNumber).toLocaleString() })] })), transaction.confirmations > 0 && (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Confirmations:" }), _jsx("span", { className: "text-gray-900", children: transaction.confirmations })] })), transaction.gasUsed && (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Gas Used:" }), _jsx("span", { className: "text-gray-900", children: parseInt(transaction.gasUsed).toLocaleString() })] })), transaction.gasPrice && (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Gas Price:" }), _jsxs("span", { className: "text-gray-900", children: [parseFloat(transaction.gasPrice).toFixed(2), " Gwei"] })] })), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Hash:" }), _jsx("span", { className: "font-mono text-gray-900 text-xs", children: formatAddress(transaction.hash) })] })] }))] }, transaction.id))), hasMore && (_jsx("div", { className: "text-center pt-4", children: _jsx("button", { onClick: loadMore, disabled: isLoadingMore, className: "px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50", children: isLoadingMore ? (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" }), _jsx("span", { children: "Loading..." })] })) : ('Load More') }) }))] })) })] }));
};
export default TransactionHistoryScreen;
