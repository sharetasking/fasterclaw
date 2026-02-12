import { ChangeEventHandler, KeyboardEvent } from "react";
import TextareaAutosize from "react-textarea-autosize";
import Icon from "@/components/Icon";
import AddFile from "./AddFile";
import Files from "./Files";

interface MessageProps {
    value: string;
    onChange: ChangeEventHandler<HTMLTextAreaElement>;
    onSend?: () => void;
    disabled?: boolean;
    placeholder?: string;
    image?: string;
    document?: string;
}

const Message = ({
    value,
    onChange,
    onSend,
    disabled,
    placeholder,
    image,
    document,
}: MessageProps) => {
    const stylesButton = "group absolute right-3 bottom-2 w-10 h-10";

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (onSend && value.trim() && disabled !== true) {
                onSend();
            }
        }
    };

    return (
        <div className="relative z-5 px-10 pb-6 before:absolute before:-top-6 before:left-0 before:right-6 before:bottom-1/2 before:bg-gradient-to-b before:to-n-1 before:from-n-1/0 before:pointer-events-none 2xl:px-6 2xl:pb-5 md:px-4 md:pb-4 dark:before:to-n-6 dark:before:from-n-6/0">
            <div className="relative z-2 border-2 border-n-3 rounded-xl overflow-hidden dark:border-n-5">
                {((image != null && image !== "") || (document != null && document !== "")) && (
                    <Files image={image} document={document} />
                )}
                <div className="relative flex items-center min-h-[3.5rem] px-16 text-0">
                    <AddFile />
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
                    {value === "" ? (
                        <button className={stylesButton} disabled={disabled}>
                            <Icon
                                className="fill-n-4 transition-colors group-hover:fill-primary-1"
                                name="recording"
                            />
                        </button>
                    ) : (
                        <button
                            className={`${stylesButton} bg-primary-1 rounded-xl transition-colors hover:bg-primary-1/90 disabled:opacity-50`}
                            onClick={() => {
                                if (onSend && disabled !== true) {
                                    onSend();
                                }
                            }}
                            disabled={disabled}
                        >
                            <Icon className="fill-n-1" name="arrow-up" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Message;
