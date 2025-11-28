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
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          Question {index + 1}
        </h4>
        <div className="flex space-x-2">
          {canEdit && !isEditing && (
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
          )}
          {canEdit && isEditing && (
            <button
              onClick={() => onEdit()}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              Done
            </button>
          )}
          {canEdit && (
            <button
              onClick={onDelete}
              className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M4 5a1 1 0 011-1h10a1 1 0 011 1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 112 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V9z" clipRule="evenodd" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Title
            </label>
            <input
              type="text"
              value={question.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter question title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={question.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Provide additional context for this question"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Image (Optional)
            </label>
            <div className="space-y-2">
              {question.image && (
                <div className="relative inline-block">
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL}${question.image}`}
                    alt="Question preview"
                    className="max-w-64 max-h-64 object-cover rounded border border-gray-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onUpdate({ image: undefined })}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 cursor-pointer"
                    title="Remove image"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
              <div>
                <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  {uploadingQuestionImage ? 'Uploading...' : question.image ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQuestionImageUpload}
                    disabled={uploadingQuestionImage}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, WebP or SVG. Max 10MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments (Documents)
            </label>
            <div className="space-y-2">
              {(question.attachments || []).map((attachment, index) => (
                <div key={index} className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg p-2">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                  </svg>
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL}${attachment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-primary-600 hover:text-primary-800 truncate"
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
                    className="text-red-600 hover:text-red-800 cursor-pointer flex-shrink-0"
                    title="Remove attachment"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {uploadingAttachment ? 'Uploading...' : 'Upload Document'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.json,.md"
                  onChange={handleAttachmentUpload}
                  disabled={uploadingAttachment}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP, etc. Max 20MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Selection
              </label>
              <input
                type="number"
                min="1"
                value={question.minSelection}
                onChange={(e) => onUpdate({ minSelection: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Selection
              </label>
              <input
                type="number"
                min="1"
                value={question.maxSelection}
                onChange={(e) => onUpdate({ maxSelection: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id={`randomized-${question.id}`}
              type="checkbox"
              checked={question.randomizedOrder}
              onChange={(e) => onUpdate({ randomizedOrder: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor={`randomized-${question.id}`} className="ml-2 block text-sm text-gray-900">
              Randomize option order for each participant
            </label>
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Options
              </label>
              <button
                onClick={onAddOption}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-900 bg-gray-300 hover:bg-gray-400 cursor-pointer"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Option
              </button>
            </div>
            
            <div className="space-y-3">
              {question.options.map((option, optIndex) => (
                <div key={option.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Option {optIndex + 1}</span>
                    <button
                      onClick={() => onDeleteOption(option.id)}
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Option Title *
                      </label>
                      <input
                        type="text"
                        value={option.title}
                        onChange={(e) => onUpdateOption(option.id, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Option title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Short Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={option.shortDescription || ''}
                        onChange={(e) => onUpdateOption(option.id, { shortDescription: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Brief description shown in summary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Long Description (Optional)
                      </label>
                      <textarea
                        value={option.longDescription || ''}
                        onChange={(e) => onUpdateOption(option.id, { longDescription: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        placeholder="Detailed description for this option"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        External Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={option.link || ''}
                        onChange={(e) => onUpdateOption(option.id, { link: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Option Image (Optional)
                      </label>
                      {option.image && (
                        <div className="mt-2 mb-2 relative inline-block">
                          <img
                            src={`${import.meta.env.VITE_API_BASE_URL}${option.image}`}
                            alt="Option preview"
                            className="max-w-32 max-h-32 object-cover rounded border border-gray-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateOption(option.id, { image: undefined })}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 cursor-pointer"
                            title="Remove image"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        {uploadingOptionImage === option.id ? 'Uploading...' : option.image ? 'Change Image' : 'Upload Image'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleOptionImageUpload(option.id, e)}
                          disabled={uploadingOptionImage === option.id}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, WebP or SVG. Max 10MB.</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {question.options.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 text-sm">No options added yet. Click "Add Option" to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h5 className="font-medium text-gray-900">{question.title}</h5>
            {question.description && (
              <p className="text-gray-600 text-sm mt-1">{question.description}</p>
            )}
            {question.image && (
              <div className="mt-2">
                <img
                  src={question.image}
                  alt="Question"
                  className="max-w-64 max-h-64 object-cover rounded border border-gray-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            {question.attachments && question.attachments.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-700 mb-1">Attachments:</p>
                <div className="space-y-1">
                  {question.attachments.filter(att => att.trim()).map((attachment, idx) => (
                    <a
                      key={idx}
                      href={`${import.meta.env.VITE_API_BASE_URL}${attachment}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-primary-600 hover:text-primary-800"
                    >
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                      </svg>
                      {attachment.split('/').pop() || `Attachment ${idx + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Min: {question.minSelection}</span>
            <span>Max: {question.maxSelection}</span>
            <span>{question.options.length} options</span>
            {question.randomizedOrder && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Randomized
              </span>
            )}
          </div>
          
          {question.options.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Options:</p>
              <div className="space-y-3">
                {question.options.map((option, idx) => (
                  <div key={option.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h6 className="text-sm font-medium text-gray-900">
                          {idx + 1}. {option.title}
                        </h6>
                        {option.shortDescription && (
                          <p className="text-xs text-gray-600 mt-1">{option.shortDescription}</p>
                        )}
                        {option.longDescription && (
                          <p className="text-xs text-gray-500 mt-2">{option.longDescription}</p>
                        )}
                        <div className="flex items-center space-x-3 mt-2">
                          {option.link && (
                            <a
                              href={option.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-primary-600 hover:text-primary-800"
                            >
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                              </svg>
                              View Link
                            </a>
                          )}
                        </div>
                      </div>
                      {option.image && (
                        <div className="ml-3 flex-shrink-0">
                          <img
                            src={option.image}
                            alt={`Option ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded border border-gray-300"
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
  );
};

export default QuestionEditor;
