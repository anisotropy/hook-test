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
