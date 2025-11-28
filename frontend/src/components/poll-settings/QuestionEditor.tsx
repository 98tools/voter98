import React, { useState } from 'react';
import type { BallotQuestion, BallotOption } from '../../types';
import { uploadImage, uploadFile, validateImageFile, validateFile } from '../../utils/storage';

interface QuestionEditorProps {
  question: BallotQuestion;
  index: number;
  isEditing: boolean;
  canEdit?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<BallotQuestion>) => void;
  onAddOption: () => void;
  onDeleteOption: (optionId: string) => void;
  onUpdateOption: (optionId: string, updates: Partial<BallotOption>) => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  index,
  isEditing,
  canEdit = true,
  onEdit,
  onDelete,
  onUpdate,
  onAddOption,
  onDeleteOption,
  onUpdateOption
}) => {
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadingOptionImage, setUploadingOptionImage] = useState<string | null>(null);

  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingQuestionImage(true);
    try {
      const response = await uploadImage(file);
      onUpdate({ image: response.data.url });
    } catch (error) {
      console.error('Error uploading question image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingQuestionImage(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, 'any', 20);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingAttachment(true);
    try {
      const response = await uploadFile(file, 'document');
      const newAttachments = [...(question.attachments || []), response.data.url];
      onUpdate({ attachments: newAttachments });
    } catch (error) {
      console.error('Error uploading attachment:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingAttachment(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const handleOptionImageUpload = async (optionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingOptionImage(optionId);
    try {
      const response = await uploadImage(file);
      onUpdateOption(optionId, { image: response.data.url });
    } catch (error) {
      console.error('Error uploading option image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingOptionImage(null);
    }
  };

  return (
    <div className={`rounded-xl overflow-hidden transition-all duration-200 ${
      isEditing ? 'bg-white shadow-lg border-2 border-blue-500' : 'bg-white shadow-md border border-gray-200 hover:shadow-lg'
    }`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${isEditing ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
              isEditing ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
            }`}>
              {index + 1}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Editing Question' : question.title || `Question ${index + 1}`}
              </h4>
              {!isEditing && question.description && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{question.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <div className="flex items-center space-x-2 mr-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-white rounded-md border border-gray-200">
                  {question.options.length} options
                </span>
                {question.randomizedOrder && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md border border-purple-200">
                    🔀 Random
                  </span>
                )}
              </div>
            )}
            {canEdit && !isEditing && (
              <button
                onClick={onEdit}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
            )}
            {canEdit && isEditing && (
              <button
                onClick={() => onEdit()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Save
              </button>
            )}
            {canEdit && (
              <button
                onClick={onDelete}
                className="inline-flex items-center p-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                title="Delete question"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M4 5a1 1 0 011-1h10a1 1 0 011 1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 112 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V9z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isEditing ? (
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h5>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={question.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Who should be the next team lead?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={question.description || ''}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                  placeholder="Provide additional context to help voters understand this question..."
                />
              </div>
            </div>

            {/* Media Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-1 w-1 rounded-full bg-purple-500"></div>
                <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Media & Attachments</h5>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Question Image */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      Question Image
                    </span>
                  </label>
                  {question.image ? (
                    <div className="relative group">
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL}${question.image}`}
                        alt="Question preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onUpdate({ image: undefined })}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="mt-2 text-sm text-gray-500">
                        {uploadingQuestionImage ? 'Uploading...' : 'Click to upload image'}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">PNG, JPG, GIF (Max 10MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQuestionImageUpload}
                        disabled={uploadingQuestionImage}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Attachments */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                      </svg>
                      Documents ({(question.attachments || []).length})
                    </span>
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(question.attachments || []).map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-2.5 hover:border-blue-300 transition-colors group">
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <a
                          href={`${import.meta.env.VITE_API_BASE_URL}${attachment}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm text-blue-600 hover:text-blue-800 truncate font-medium"
                          title={attachment}
                        >
                          {attachment.split('/').pop() || `Attachment ${index + 1}`}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const newAttachments = (question.attachments || []).filter((_, i) => i !== index);
                            onUpdate({ attachments: newAttachments });
                          }}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:bg-white hover:text-blue-600 cursor-pointer transition-all">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      {uploadingAttachment ? 'Uploading...' : 'Add Document'}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.json,.md"
                        onChange={handleAttachmentUpload}
                        disabled={uploadingAttachment}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-1 w-1 rounded-full bg-green-500"></div>
                <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Voting Settings</h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                      Minimum Selection
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={question.minSelection}
                    onChange={(e) => onUpdate({ minSelection: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold text-center"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">At least this many options</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                      Maximum Selection
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={question.maxSelection}
                    onChange={(e) => onUpdate({ maxSelection: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold text-center"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">Up to this many options</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    id={`randomized-${question.id}`}
                    type="checkbox"
                    checked={question.randomizedOrder}
                    onChange={(e) => onUpdate({ randomizedOrder: e.target.checked })}
                    className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900 flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                      </svg>
                      Randomize Option Order
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">Options will appear in different order for each voter</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Options Section */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-1 w-1 rounded-full bg-orange-500"></div>
                  <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Answer Options ({question.options.length})
                  </h5>
                </div>
                <button
                  onClick={onAddOption}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-sm transition-all"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Option
                </button>
              </div>
              
              <div className="space-y-4">
                {question.options.map((option, optIndex) => (
                  <div key={option.id} className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 hover:border-orange-300 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white font-bold text-sm">
                          {optIndex + 1}
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Option {optIndex + 1}</span>
                      </div>
                      <button
                        onClick={() => onDeleteOption(option.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete option"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M4 5a1 1 0 011-1h10a1 1 0 011 1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 112 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V9z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Option Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={option.title}
                          onChange={(e) => onUpdateOption(option.id, { title: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium"
                          placeholder="e.g., Option A, John Doe, Yes..."
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Short Description
                          </label>
                          <input
                            type="text"
                            value={option.shortDescription || ''}
                            onChange={(e) => onUpdateOption(option.id, { shortDescription: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            placeholder="Brief summary..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            External Link
                          </label>
                          <input
                            type="url"
                            value={option.link || ''}
                            onChange={(e) => onUpdateOption(option.id, { link: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Long Description
                        </label>
                        <textarea
                          value={option.longDescription || ''}
                          onChange={(e) => onUpdateOption(option.id, { longDescription: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none transition-all"
                          placeholder="Detailed information about this option..."
                        />
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1.5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                            Option Image
                          </span>
                        </label>
                        {option.image ? (
                          <div className="relative group">
                            <img
                              src={`${import.meta.env.VITE_API_BASE_URL}${option.image}`}
                              alt="Option preview"
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => onUpdateOption(option.id, { image: undefined })}
                              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-100 transition-colors">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="mt-2 text-xs text-gray-500">
                              {uploadingOptionImage === option.id ? 'Uploading...' : 'Click to upload'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleOptionImageUpload(option.id, e)}
                              disabled={uploadingOptionImage === option.id}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {question.options.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-600 font-medium mb-1">No options added yet</p>
                    <p className="text-gray-400 text-sm">Click "Add Option" above to create voting choices</p>
                  </div>
                )}

                {/* Add Option Button at Bottom */}
                {question.options.length > 0 && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={onAddOption}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg transition-all"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add Another Option
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // View Mode
          <div className="space-y-4">
            {/* Question Content */}
            <div>
              <h5 className="text-lg font-semibold text-gray-900 mb-2">{question.title}</h5>
              {question.description && (
                <p className="text-gray-600 leading-relaxed">{question.description}</p>
              )}
            </div>

            {/* Question Image & Attachments */}
            {(question.image || (question.attachments && question.attachments.length > 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {question.image && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Question Image</p>
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL}${question.image}`}
                      alt="Question"
                      className="w-full h-40 object-cover rounded-lg border border-gray-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {question.attachments && question.attachments.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Attachments ({question.attachments.length})</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {question.attachments.filter(att => att.trim()).map((attachment, idx) => (
                        <a
                          key={idx}
                          href={`${import.meta.env.VITE_API_BASE_URL}${attachment}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-xs text-blue-600 hover:text-blue-800 hover:bg-white p-2 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate font-medium">{attachment.split('/').pop() || `File ${idx + 1}`}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Settings Info */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
                Min: {question.minSelection}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
                Max: {question.maxSelection}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                {question.options.length} Options
              </span>
              {question.randomizedOrder && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                  Randomized
                </span>
              )}
            </div>
            
            {/* Options Preview */}
            {question.options.length > 0 && (
              <div className="pt-2">
                <h6 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  Answer Options
                </h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {question.options.map((option, idx) => (
                    <div key={option.id} className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 hover:border-orange-300 transition-all">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="text-sm font-semibold text-gray-900 mb-1">
                            {option.title}
                          </h6>
                          {option.shortDescription && (
                            <p className="text-xs text-gray-600 mb-1">{option.shortDescription}</p>
                          )}
                          {option.longDescription && (
                            <p className="text-xs text-gray-500 line-clamp-2">{option.longDescription}</p>
                          )}
                          {option.link && (
                            <a
                              href={option.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                            >
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                              </svg>
                              View Link
                            </a>
                          )}
                        </div>
                        {option.image && (
                          <div className="flex-shrink-0">
                            <img
                              src={`${import.meta.env.VITE_API_BASE_URL}${option.image}`}
                              alt={`Option ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionEditor;
