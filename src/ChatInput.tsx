import {styled, TextField} from "@mui/material";
import React, {KeyboardEventHandler} from "react";
import {StateSetter} from "./Utils.ts";

const ChatInput = styled(TextField)({
  backgroundColor: "black",
  color: "white",
  '& .MuiOutlinedInput-input': {},
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      backgroundColor: "#333",
      opacity: 0.5,
      border: 'none',  // Remove default border
    },
    '&:hover fieldset': {
      border: 'none',  // Remove border on hover
    },
    '&.Mui-focused fieldset': {
      backgroundColor: "black",
      border: 'none',  // Remove border on focus
    },
  },
});

interface ChatInputComponentProps {
    inputRef: React.RefObject<HTMLDivElement>;
    prompt: string;
    loading: boolean;
    handleSubmit: (e: React.KeyboardEvent) => void;
    setPrompt: StateSetter<string>
}

function ChatInputComponent(props: ChatInputComponentProps) {
  // submit on enter
  const handleSubmitKey: KeyboardEventHandler<HTMLElement> = async (e) => {
    // shift enter is newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (new line)
      props.handleSubmit(e); // Submit the form
    }
  };
  return <ChatInput
      ref={props.inputRef}
      hiddenLabel
      multiline
      margin="none"
      value={props.prompt}
      maxRows={4}
      {...{disabled: props.loading}}
      fullWidth
      onKeyDown={handleSubmitKey}
      onChange={e => props.setPrompt(e.target.value)}
  />;
}

export {ChatInputComponent, ChatInput};