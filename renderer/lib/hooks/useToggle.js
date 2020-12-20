import { useState } from "react";

export default function useToggle(initialState = false) {
  const [state, setState] = useState(Boolean(initialState));

  function toggleState() {
    setState((prevState) => !prevState);
  }

  function overrideState(newState) {
    setState((prevState) =>
      Boolean(typeof newState === "function" ? newState(prevState) : newState)
    );
  }

  return [state, toggleState, overrideState];
}
