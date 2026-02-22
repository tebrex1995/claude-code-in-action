import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationDisplay } from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

test("shows 'Created' for str_replace_editor create command", () => {
  render(
    <ToolInvocationDisplay
      tool={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/components/Card.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Created /components/Card.jsx")).toBeDefined();
});

test("shows 'Edited' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationDisplay
      tool={{
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/App.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Edited /App.jsx")).toBeDefined();
});

test("shows 'Edited' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationDisplay
      tool={{
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/utils/helpers.js" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Edited /utils/helpers.js")).toBeDefined();
});

test("shows 'Viewed' for str_replace_editor view command", () => {
  render(
    <ToolInvocationDisplay
      tool={{
        toolName: "str_replace_editor",
        args: { command: "view", path: "/App.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Viewed /App.jsx")).toBeDefined();
});

test("shows 'Reverted' for str_replace_editor undo_edit command", () => {
  render(
    <ToolInvocationDisplay
      tool={{
        toolName: "str_replace_editor",
        args: { command: "undo_edit", path: "/App.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Reverted /App.jsx")).toBeDefined();
});

test("shows 'Renamed' for file_manager rename command", () => {
  render(
    <ToolInvocationDisplay
      tool={{
        toolName: "file_manager",
        args: {
          command: "rename",
          path: "/old-name.jsx",
          new_path: "/new-name.jsx",
        },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(
    screen.getByText("Renamed /old-name.jsx → /new-name.jsx")
  ).toBeDefined();
});

test("shows 'Deleted' for file_manager delete command", () => {
  render(
    <ToolInvocationDisplay
      tool={{
        toolName: "file_manager",
        args: { command: "delete", path: "/temp.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Deleted /temp.jsx")).toBeDefined();
});

test("falls back to tool name for unknown tools", () => {
  render(
    <ToolInvocationDisplay
      tool={{
        toolName: "some_unknown_tool",
        args: {},
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

test("shows green dot for completed tool invocations", () => {
  const { container } = render(
    <ToolInvocationDisplay
      tool={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  const dot = container.querySelector(".bg-emerald-500");
  expect(dot).not.toBeNull();
});

test("shows spinner for in-progress tool invocations", () => {
  const { container } = render(
    <ToolInvocationDisplay
      tool={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
});
