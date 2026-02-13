import { useState, useRef, useEffect, ChangeEventHandler, KeyboardEvent } from "react";
import TextareaAutosize from "react-textarea-autosize";
import Icon from "@/components/Icon";
import AddFile from "./AddFile";
import Files from "./Files";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (_file: File): void => {};

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
function getSpeechRecognitionCtor(): (new () => any) | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => any) | undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

interface AttachedFile {
  file: File;
  previewUrl?: string;
  name: string;
  isImage: boolean;
}

interface MessageProps {
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  onSend?: () => void;
  onFileSelect?: (file: File) => void;
  onFileRemove?: () => void;
  onTranscript?: (text: string) => void;
  attachedFile?: AttachedFile | null;
  disabled?: boolean;
  placeholder?: string;
  isUploading?: boolean;
  image?: string;
  document?: string;
}

const Message = ({
  value,
  onChange,
  onSend,
  onFileSelect,
  onFileRemove,
  onTranscript,
  attachedFile,
  disabled,
  placeholder,
  isUploading,
  image,
  document,
}: MessageProps) => {
  const stylesButton = "group absolute right-3 bottom-2 w-10 h-10";

  const [isRecording, setIsRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const preRecordingTextRef = useRef("");

  useEffect(() => {
    return () => {
      if (recognitionRef.current != null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        recognitionRef.current.stop();
      }
    };
  }, []);

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
  const startRecording = () => {
    const SR = getSpeechRecognitionCtor();
    if (SR == null) {
      return;
    }

    preRecordingTextRef.current = value;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (const result of Array.from(event.results as ArrayLike<any>)) {
        transcript += String(result[0].transcript);
      }
      const prefix = preRecordingTextRef.current;
      const fullText = prefix !== "" ? `${prefix} ${transcript}` : transcript;
      onTranscript?.(fullText);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      const errorCode = String(event.error);
      if (errorCode !== "no-speech" && errorCode !== "aborted") {
        console.error("Speech recognition error:", errorCode);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */

  const stopRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (onSend && (value.trim() !== "" || attachedFile != null) && disabled !== true) {
        onSend();
      }
    }
  };

  // Determine what to show in the file preview area
  const showImage =
    attachedFile?.isImage === true &&
    attachedFile.previewUrl != null &&
    attachedFile.previewUrl !== ""
      ? attachedFile.previewUrl
      : image;
  const showDocument = attachedFile != null && !attachedFile.isImage ? attachedFile.name : document;

  const hasFile =
    (showImage != null && showImage !== "") || (showDocument != null && showDocument !== "");

  const canSend =
    onSend != null && (value.trim() !== "" || attachedFile != null) && disabled !== true;

  return (
    <div className="relative z-5 px-10 pb-6 before:absolute before:-top-6 before:left-0 before:right-6 before:bottom-1/2 before:bg-gradient-to-b before:to-n-1 before:from-n-1/0 before:pointer-events-none 2xl:px-6 2xl:pb-5 md:px-4 md:pb-4 dark:before:to-n-6 dark:before:from-n-6/0">
      <div className="relative z-2 border-2 border-n-3 rounded-xl overflow-hidden dark:border-n-5">
        {hasFile && <Files image={showImage} document={showDocument} onRemove={onFileRemove} />}
        {isUploading === true && (
          <div className="px-4 py-2 border-b-2 border-n-3 dark:border-n-5">
            <div className="flex items-center gap-2 text-sm text-n-4">
              <div className="w-4 h-4 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
              Uploading file...
            </div>
          </div>
        )}
        <div className="relative flex items-center min-h-[3.5rem] px-16 text-0">
          <AddFile
            onFileSelect={onFileSelect ?? noop}
            disabled={disabled === true || isUploading === true}
          />
          <TextareaAutosize
            className="w-full py-3 bg-transparent body2 text-n-7 outline-none resize-none placeholder:text-n-4/75 dark:text-n-1 dark:placeholder:text-n-4"
            maxRows={5}
            autoFocus
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "Ask Brainwave anything"}
            disabled={disabled}
          />
          {isRecording ? (
            <button
              className={`${stylesButton} bg-red-500 rounded-xl transition-colors hover:bg-red-600`}
              onClick={stopRecording}
            >
              <Icon className="fill-n-1 animate-pulse" name="recording" />
            </button>
          ) : canSend ? (
            <button
              className={`${stylesButton} bg-primary-1 rounded-xl transition-colors hover:bg-primary-1/90 disabled:opacity-50`}
              onClick={() => {
                onSend();
              }}
              disabled={disabled}
            >
              <Icon className="fill-n-1" name="arrow-up" />
            </button>
          ) : (
            <button className={stylesButton} onClick={startRecording} disabled={disabled === true}>
              <Icon
                className="fill-n-4 transition-colors group-hover:fill-primary-1"
                name="recording"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
