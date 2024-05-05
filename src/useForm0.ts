import { useState } from "react";

const submitValue = async (value: string) => {
  if (value === "xxx") throw new Error("");
};

const useForm = () => {
  const [state, setState] = useState({
    value: "",
    error: "",
    isSubmitting: false,
  });
  const change = (value: string) => {
    setState((prev) => ({ ...prev, value }));
  };
  const submit = async () => {
    setState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await submitValue(state.value);
      setState((prev) => ({ ...prev, error: "", isSubmitting: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: "error", isSubmitting: false }));
    }
  };
  return { ...state, change, submit };
};

export { useForm };
