import { useRef } from "react";
import Icon from "@/components/Icon";

type AddFileProps = {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
};

const ACCEPTED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

const AddFile = ({ onFileSelect, disabled }: AddFileProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        if (!disabled) {
            inputRef.current?.click();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
            // Reset the input so the same file can be selected again
            e.target.value = "";
        }
    };

    return (
        <>
            <button
                className="group absolute left-3 bottom-2 w-10 h-10 outline-none"
                onClick={handleClick}
                disabled={disabled}
                type="button"
            >
                <Icon
                    className="w-7 h-7 fill-[#7F8689] transition-colors group-hover:fill-primary-1 dark:fill-n-4"
                    name="plus-circle"
                />
            </button>
            <input
                ref={inputRef}
                className="hidden"
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleChange}
            />
        </>
    );
};

export default AddFile;
