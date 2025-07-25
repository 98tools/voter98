import React, { useState, useEffect } from 'react';
import type { Poll, BallotQuestion, BallotOption, PollPermissions } from '../../types';
import QuestionEditor from './QuestionEditor.tsx';

interface QuestionsTabProps {
  poll: Poll;
  permissions: PollPermissions;
  onSave: (updates: Partial<Poll>) => void;
  saving: boolean;
}

const QuestionsTab: React.FC<QuestionsTabProps> = ({ poll, permissions, onSave, saving }) => {
  const [questions, setQuestions] = useState(poll.ballot);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  // Update questions when poll changes
  useEffect(() => {
    setQuestions(poll.ballot);
  }, [poll.ballot]);

  const handleAddQuestion = () => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      title: 'New Question',
      description: '',
      randomizedOrder: false,
      minSelection: 1,
      maxSelection: 1,
      attachments: [],
      options: []
    };
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    setEditingQuestion(newQuestion.id);
  };

  const handleDeleteQuestion = (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);
    onSave({ ballot: updatedQuestions });
  };

  const handleUpdateQuestion = (questionId: string, updates: Partial<typeof questions[0]>) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    );
    setQuestions(updatedQuestions);
  };

  const handleSaveQuestions = () => {
    onSave({ ballot: questions });
    setEditingQuestion(null);
  };

  const handleAddOption = (questionId: string) => {
    const newOption = {
      id: `opt_${Date.now()}`,
      title: 'New Option',
      shortDescription: '',
      longDescription: '',
      link: '',
      image: ''
    };
    
    const updatedQuestions = questions.map(q => 
      q.id === questionId 
        ? { ...q, options: [...q.options, newOption] }
        : q
    );
    setQuestions(updatedQuestions);
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.filter(opt => opt.id !== optionId) }
        : q
    );
    setQuestions(updatedQuestions);
  };

  const handleUpdateOption = (questionId: string, optionId: string, updates: Partial<typeof questions[0]['options'][0]>) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options.map(opt => 
              opt.id === optionId ? { ...opt, ...updates } : opt
            ) 
          }
        : q
    );
    setQuestions(updatedQuestions);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Poll Questions</h3>
        <div className="flex space-x-3">
          {permissions.canEdit && (
            <button
              onClick={handleAddQuestion}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Question
            </button>
          )}
          {editingQuestion && permissions.canEdit && (
            <button
              onClick={handleSaveQuestions}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
          <p className="text-gray-500 mb-4">Add your first question to get started.</p>
          {permissions.canEdit && (
            <button
              onClick={handleAddQuestion}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              Add Question
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              isEditing={editingQuestion === question.id}
              canEdit={permissions.canEdit}
              onEdit={() => setEditingQuestion(question.id)}
              onDelete={() => handleDeleteQuestion(question.id)}
              onUpdate={(updates: Partial<BallotQuestion>) => handleUpdateQuestion(question.id, updates)}
              onAddOption={() => handleAddOption(question.id)}
              onDeleteOption={(optionId: string) => handleDeleteOption(question.id, optionId)}
              onUpdateOption={(optionId: string, updates: Partial<BallotOption>) => handleUpdateOption(question.id, optionId, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionsTab;
