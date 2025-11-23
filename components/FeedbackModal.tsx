
import React, { useState } from 'react';
import { X, MessageSquare, Star, Send } from 'lucide-react';
import { analytics } from '../services/analytics';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating.");
      return;
    }
    analytics.submitFeedback(rating, comment);
    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
      setIsSubmitted(false);
      setRating(0);
      setComment('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {!isSubmitted ? (
          <>
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-600" />
                Share Feedback
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6 text-center">
                <label className="block text-sm font-medium text-slate-600 mb-3">How would you rate your experience?</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star 
                        size={32} 
                        className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Comments or Feature Requests</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what you liked or what we can improve..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Send size={16} />
                  Submit Feedback
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Thank You!</h3>
            <p className="text-slate-500">Your feedback helps us improve BioTrial Analytics.</p>
          </div>
        )}
      </div>
    </div>
  );
};
