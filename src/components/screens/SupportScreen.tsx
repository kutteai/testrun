import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, MessageCircle, BookOpen, ExternalLink, Search, HelpCircle } from 'lucide-react';
import type { ScreenProps } from '../../types/index';

const SupportScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const supportCategories = [
    {
      icon: BookOpen,
      title: 'Getting Started',
      description: 'Learn the basics of using PayCio',
      articles: [
        'How to create a wallet',
        'How to import an existing wallet',
        'How to send and receive crypto',
        'Understanding gas fees'
      ]
    },
    {
      icon: HelpCircle,
      title: 'Account & Security',
      description: 'Manage your account and security settings',
      articles: [
        'How to backup your wallet',
        'How to change your password',
        'How to add custom networks',
        'Hardware wallet setup'
      ]
    },
    {
      icon: MessageCircle,
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      articles: [
        'Transaction stuck or pending',
        'Cannot connect to dApps',
        'Balance not showing correctly',
        'Network connection issues'
      ]
    }
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get help via email',
      action: () => window.open('mailto:support@paycio.com', '_blank')
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat with our support team',
      action: () => window.open('https://paycio.com/chat', '_blank')
    },
    {
      icon: ExternalLink,
      title: 'Community Forum',
      description: 'Ask questions in our community',
      action: () => window.open('https://community.paycio.com', '_blank')
    }
  ];

  const filteredCategories = supportCategories.filter(category =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.articles.some(article => 
      article.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-gray-50"
    >
      {/* Header */}
      <div className="bg-[#180CB2] px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Support</h1>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-6 space-y-6">
        {/* Search Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#180CB2] focus:border-[#180CB2] text-[13px]"
          />
        </motion.div>

        {/* Support Categories */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Help Center</h2>
          
          {filteredCategories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-[#180CB2]/10 rounded-lg flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-[#180CB2]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-[13px]">{category.title}</h3>
                  <p className="text-gray-600 text-[13px] mt-1">{category.description}</p>
                  
                  <div className="mt-3 space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      <button
                        key={articleIndex}
                        className="block w-full text-left text-[13px] text-[#180CB2] hover:text-[#140a8f] hover:underline"
                        onClick={() => {
                          // In a real implementation, this would open the article
                          window.open(`https://help.paycio.com/article/${article.toLowerCase().replace(/\s+/g, '-')}`, '_blank');
                        }}
                      >
                        {article}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact Options */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Contact Us</h2>
          
          <div className="space-y-3">
            {contactOptions.map((option, index) => (
              <motion.button
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                onClick={option.action}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#180CB2]/10 rounded-lg flex items-center justify-center">
                    <option.icon className="w-5 h-5 text-[#180CB2]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-[13px]">{option.title}</h3>
                    <p className="text-gray-600 text-[13px] mt-1">{option.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-[#180CB2]/5 rounded-xl p-4"
        >
          <h3 className="font-semibold text-gray-900 text-[13px] mb-3">Quick Links</h3>
          <div className="space-y-2">
            <button
              onClick={() => window.open('https://paycio.com/status', '_blank')}
              className="block w-full text-left text-[13px] text-[#180CB2] hover:text-[#140a8f] hover:underline"
            >
              System Status
            </button>
            <button
              onClick={() => window.open('https://paycio.com/security', '_blank')}
              className="block w-full text-left text-[13px] text-[#180CB2] hover:text-[#140a8f] hover:underline"
            >
              Security Center
            </button>
            <button
              onClick={() => window.open('https://paycio.com/roadmap', '_blank')}
              className="block w-full text-left text-[13px] text-[#180CB2] hover:text-[#140a8f] hover:underline"
            >
              Product Roadmap
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SupportScreen;

