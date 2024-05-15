import { useState } from "react";

const submitValue = async (value: string) => {
  if (value === "xxx") throw new Error("");
};

////////////////////////////////////////////////////////////////////

type State = { value: string; error: string; isSubmitting: boolean };

type Params = {
  state: State;
  submitter: (value: State["value"]) => Promise<void>;
  setState: (set: (state: State) => State) => void;
};

const formHandler = ({ state, submitter, setState }: Params) => {
  const change = (value: string) => {
    setState((prev) => ({ ...prev, value }));
  };
  const submit = async () => {
    setState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await submitter(state.value);
      setState((prev) => ({ ...prev, error: "", isSubmitting: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: "error", isSubmitting: false }));
    }
  };
  return { ...state, change, submit };
};

const useForm = () => {
  const [state, setState] = useState<State>({
    value: "",
    error: "",
    isSubmitting: false,
  });
  return formHandler({ state, submitter: submitValue, setState: setState });
};
