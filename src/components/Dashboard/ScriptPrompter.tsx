import React, { useState } from 'react';

interface ScriptSection {
  id: string;
  title: string;
  content: string;
  type: 'introduction' | 'main' | 'objection' | 'closing';
  isActive: boolean;
}

interface ScriptPrompterProps {
  sections?: ScriptSection[];
  currentSection?: string;
  onSectionClick?: (sectionId: string) => void;
  onSectionToggle?: (sectionId: string, isActive: boolean) => void;
  onContentEdit?: (sectionId: string, content: string) => void;
}

export const ScriptPrompter: React.FC<ScriptPrompterProps> = ({
  sections = [],
  currentSection,
  onSectionClick,
  onSectionToggle,
  onContentEdit
}) => {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const getTypeIcon = (type: ScriptSection['type']) => {
    switch (type) {
      case 'introduction': return '👋';
      case 'main': return '💬';
      case 'objection': return '⚠️';
      case 'closing': return '✅';
      default: return '📝';
    }
  };

  const getTypeColor = (type: ScriptSection['type']) => {
    switch (type) {
      case 'introduction': return 'bg-blue-100 text-blue-800';
      case 'main': return 'bg-green-100 text-green-800';
      case 'objection': return 'bg-yellow-100 text-yellow-800';
      case 'closing': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditStart = (section: ScriptSection) => {
    setEditingSection(section.id);
    setEditContent(section.content);
  };

  const handleEditSave = () => {
    if (editingSection) {
      onContentEdit?.(editingSection, editContent);
      setEditingSection(null);
      setEditContent('');
    }
  };

  const handleEditCancel = () => {
    setEditingSection(null);
    setEditContent('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Script Prompter</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {sections.filter(s => s.isActive).length} active sections
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {sections.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No script sections available
          </div>
        ) : (
          sections.map((section) => (
            <div
              key={section.id}
              className={`p-3 rounded-lg border transition-colors ${
                section.id === currentSection
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getTypeIcon(section.type)}</span>
                  <h3 className="font-medium text-sm">{section.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getTypeColor(section.type)}`}>
                    {section.type}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 text-xs">
                    <input
                      type="checkbox"
                      checked={section.isActive}
                      onChange={(e) => onSectionToggle?.(section.id, e.target.checked)}
                      className="rounded"
                    />
                    <span>Active</span>
                  </label>
                  <button
                    onClick={() => handleEditStart(section)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ✏️
                  </button>
                </div>
              </div>

              {editingSection === section.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
                    rows={3}
                    placeholder="Enter script content..."
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEditSave}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-gray-600 cursor-pointer"
                  onClick={() => onSectionClick?.(section.id)}
                >
                  {section.content.length > 100
                    ? `${section.content.substring(0, 100)}...`
                    : section.content}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {currentSection && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm">Current Section</h3>
            <button
              onClick={() => onSectionClick?.('')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {sections.find(s => s.id === currentSection)?.content}
          </div>
        </div>
      )}
    </div>
  );
};
