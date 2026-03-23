import React, { useState } from 'react';
import Card from '../components/ui/Card';
import { submitFeedback } from '../services/api';

const TenantFeedbackPage: React.FC = () => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const StarIcon: React.FC<{ filled: boolean; onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void; }> = ({ filled, onClick, onMouseEnter, onMouseLeave }) => (
        <svg
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`w-10 h-10 cursor-pointer transition-colors ${filled ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.448a1 1 0 00-1.176 0l-3.368 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.24 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            setError("Please select a rating.");
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await submitFeedback({ rating, comments });
            setSuccess("Thank you! Your feedback has been submitted successfully.");
            setRating(0);
            setComments('');
        } catch (err: any) {
            setError(err.message || "Failed to submit feedback.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-blue-900 dark:text-slate-200">Submit Feedback</h2>
            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-lg font-medium text-center text-slate-700 dark:text-slate-300">How would you rate your experience?</label>
                        <div className="flex justify-center items-center mt-4 space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon
                                    key={star}
                                    filled={(hoverRating || rating) >= star}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="comments" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Comments</label>
                        <textarea
                            id="comments"
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={5}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-700 text-blue-950 dark:text-slate-200"
                            placeholder="Tell us more about your experience..."
                        />
                    </div>

                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

                    <div className="text-right">
                        <button
                            type="submit"
                            disabled={loading || rating === 0}
                            className="bg-blue-800 dark:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default TenantFeedbackPage;