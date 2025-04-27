import { Button } from "@mui/material";
import React from "react";

function Create({ onClick }) {
  return (
    <div className="w-full text-center p-5">
      <Button
        variant="contained"
        color="success"
        className="w-1/2"
        onClick={() => {
          onClick();
        }}
      >
        Create New Room
      </Button>
    </div>
  );
}

export default Create;
