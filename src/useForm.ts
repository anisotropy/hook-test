import { useState } from "react";

const submitValue = async (value: string) => {
  if (value === "xxx") throw new Error("");
};

type State = { value: string; error: string; isSubmitting: boolean };

type Params = {
  state: State;
  submitter: (value: State["value"]) => Promise<void>;
  stateSetter: (set: (state: State) => State) => void;
};

const formHandler = ({ state, submitter, stateSetter }: Params) => {
  const change = (value: string) => {
    stateSetter((prev) => ({ ...prev, value }));
  };
  const submit = async () => {
    stateSetter((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await submitter(state.value);
      stateSetter((prev) => ({ ...prev, error: "", isSubmitting: false }));
    } catch (error) {
      stateSetter((prev) => ({ ...prev, error: "error", isSubmitting: false }));
    }
  };
  return { ...state, change, submit };
};

const useForm = () => {
  const [state, setSate] = useState<State>({
    value: "",
    error: "",
    isSubmitting: false,
  });
  return formHandler({ state, submitter: submitValue, stateSetter: setSate });
};

export { useForm, formHandler };
