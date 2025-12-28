export const exec = () => {
  console.warn("Mock child_process.exec called in browser environment");
  return {
    on: () => {},
    stdout: { on: () => {} },
    stderr: { on: () => {} },
    kill: () => {}
  };
};
export const spawn = () => {
    console.warn("Mock child_process.spawn called in browser environment");
    return {
      on: () => {},
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      kill: () => {}
    };
  };
