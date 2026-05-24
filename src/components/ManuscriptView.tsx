import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { format } from 'date-fns';
import Markdown from 'react-markdown';

export const ManuscriptView: React.FC = () => {
  const { state } = useAppStore();
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (!contentRef.current) return;
    
    // We want to copy the raw text, but maybe with some spacing preserved.
    // window.getSelection and copy command, or navigator.clipboard.writeText
    
    // Build plain text version
    let rawText = `${state.project.title}\n\n`;
    
    state.project.chapters.forEach(chapter => {
      rawText += `\n\nChapter: ${chapter.title}\n\n`;
      chapter.scenes.forEach(scene => {
        if (scene.beats) {
          scene.beats.forEach(beat => {
            if (beat.content.trim()) {
              rawText += `${beat.content.trim()}\n\n`;
            }
          });
        }
        if (scene.content.trim()) {
          rawText += `${scene.content.trim()}\n\n`;
        }
      });
    });

    try {
      await navigator.clipboard.writeText(rawText.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="h-full w-full bg-bg-main overflow-y-auto no-scrollbar relative flex flex-col items-center">
      
      {/* Manuscript Content Container */}
      <div 
        ref={contentRef}
        className="w-full max-w-2xl bg-[var(--bg-main)] min-h-full py-20 px-8 sm:px-12"
      >
        <div className="font-serif">
          
          <div className="relative mb-24 flex md:flex-row flex-col items-center justify-center group">
            <h1 className="text-4xl text-text-main font-normal tracking-wider text-center opacity-90 pr-0 md:pr-4">
              {(state.project.title === 'Untitled Project' ? 'Liturgies of Lead' : state.project.title) || 'Liturgies of Lead'}
            </h1>
            
            <div className="mt-4 md:mt-0 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 flex items-center gap-2 opacity-100 md:opacity-40 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-2 md:p-1 text-text-muted hover:text-text-main transition-colors bg-[rgba(255,255,255,0.02)] md:bg-transparent rounded-lg active:scale-95"
                title="Copy Entire Manuscript"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          {state.project.chapters.length === 0 ? (
            <div className="text-center text-text-muted mt-20 italic font-light">
              Your manuscript is empty. Create chapters and scenes to start.
            </div>
          ) : (
            <div className="flex flex-col gap-16">
              {state.project.chapters.map((chapter, chapterIndex) => (
                <div key={chapter.id} className="flex flex-col gap-8">
                  {/* Chapter Header */}
                  <div className="text-center mt-12 mb-6">
                    <h2 className="text-2xl text-text-main font-light tracking-wide uppercase opacity-80 mb-2">
                      {chapter.title || `Chapter ${chapterIndex + 1}`}
                    </h2>
                    <div className="w-12 h-px bg-text-main opacity-20 mx-auto"></div>
                  </div>

                  {/* Scenes */}
                  {chapter.scenes.length === 0 ? (
                    <p className="text-center text-text-muted opacity-50 italic text-sm font-light">
                      Empty chapter...
                    </p>
                  ) : (
                    <div className="flex flex-col gap-8">
                      {chapter.scenes.map((scene, sceneIndex) => {
                        let combinedContent = '';
                        if (scene.beats) {
                          scene.beats.forEach(beat => {
                            if (beat.content.trim()) combinedContent += beat.content.trim() + '\n\n';
                          });
                        }
                        if (scene.content.trim()) combinedContent += scene.content.trim() + '\n\n';
                        combinedContent = combinedContent.trim();
                        
                        return (
                        <div key={scene.id} className="text-text-main leading-relaxed">
                          {combinedContent ? (
                            <div className={cn("manuscript-content", sceneIndex === 0 && "manuscript-first-scene")}>
                              <Markdown>{combinedContent}</Markdown>
                            </div>
                          ) : (
                            <p className="text-center text-text-muted opacity-30 italic text-sm">
                              [Scene {sceneIndex + 1} is empty]
                            </p>
                          )}
                          
                          {/* Scene separator if it's not the last scene in the chapter */}
                          {sceneIndex < chapter.scenes.length - 1 && (
                            <div className="flex justify-center gap-4 my-12 opacity-30">
                              <span>*</span>
                              <span>*</span>
                              <span>*</span>
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {state.project.chapters.length > 0 && (
             <div className="w-full text-center mt-32 opacity-20 relative">
              <span className="font-normal tracking-[0.3em] uppercase text-xs">The End</span>
             </div>
          )}

        </div>
      </div>

    </div>
  );
};
