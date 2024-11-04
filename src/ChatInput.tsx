import {styled, TextField} from "@mui/material";

export const ChatInput = styled(TextField)({
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