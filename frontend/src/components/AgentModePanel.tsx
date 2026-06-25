"use client";

import { Bot, BookOpen, Code2, Hammer, ListFilter, Sparkles } from "lucide-react";

export function AgentModePanel() {
  return (
    <aside className="agent-panel">
      <div className="agent-panel-toolbar">
        <button className="agent-ai-button" title="Agent Mode">
          <Sparkles size={15} />
          AI
        </button>
        <button className="icon-button compact" title="Agent activity">
          <ListFilter size={15} />
        </button>
        <button className="icon-button compact" title="Code">
          <Code2 size={16} />
        </button>
      </div>

      <div className="agent-panel-content">
        <div className="agent-intro">
          <h2>Build faster with Agent Mode</h2>
          <p>Use Agent Mode to transform the way you work with APIs.</p>
        </div>

        <div className="agent-feature-list">
          <div className="agent-feature">
            <Hammer size={19} />
            <div>
              <h3>Get your API working</h3>
              <p>Fix configurations, scripts, or anything else to get your request working.</p>
            </div>
          </div>
          <div className="agent-feature">
            <BookOpen size={19} />
            <div>
              <h3>Document</h3>
              <p>Describe what type of documentation you'd like, and watch Agent Mode do the rest.</p>
            </div>
          </div>
          <div className="agent-feature">
            <Bot size={19} />
            <div>
              <h3>Explore</h3>
              <p>Let Agent Mode configure requests and identify use-cases.</p>
            </div>
          </div>
          <div className="agent-feature">
            <Sparkles size={19} />
            <div>
              <h3>And much more!</h3>
              <p>Use Agent Mode across Flows, Monitors, Mocks, and more!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="agent-panel-footer">
        <p>
          By using this AI product, you agree to Postman's <a href="#">Terms of Service</a>
        </p>
        <button>Agree and Continue</button>
      </div>
    </aside>
  );
}
