import { useState } from "react";

const submitValue = async (value: string) => {
  if (value === "xxx") throw new Error("");
};

////////////////////////////////////////////////////////////////////

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
  
const Form = () => {
  const form = useForm();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit();
      }}
    >
      <input value={form.value} onChange={(e) => form.change(e.target.value)} />
      <p>{form.error}</p>
    </form>
  );
};


  