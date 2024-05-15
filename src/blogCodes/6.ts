import { useState } from "react";

type SetState<S> = (set: (state: S) => S) => void;

type Handler<Config, State, Result> = (
  config: Config,
  state: State,
  setState: SetState<State>
) => Result;

const createHook =
  <Config, State, Result>(
    createState: () => [State, SetState<State>],
    config: Config,
    handler: Handler<Config, State, Result>
  ) =>
  () => {
    const [state, setState] = createState();
    return handler(config, state, setState);
  };

const submitValue = async (value: string) => {
  if (value === "xxx") throw new Error("");
};

////////////////////////////////////////////////////////////////////////////////////////////

type State = { value: string; error: string; isSubmitting: boolean };

const initState: State = { value: "", error: "", isSubmitting: false };

const formHandler = (
  config: { submitter: (value: State["value"]) => Promise<void> },
  state: State,
  setState: SetState<State>
) => { ... };

const useForm = createHook(
  () => useState<State>(initState),
  { submitter: submitValue },
  formHandler
);