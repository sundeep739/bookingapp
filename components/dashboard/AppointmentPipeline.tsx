"use client";

const pipeline = [
  {
    stage: "New Request",
    count: 4,
    color: "#3b82f6",
    items: ["Alice Johnson", "Bob Smith", "Carol White"],
  },
  {
    stage: "Confirmed",
    count: 6,
    color: "#10b981",
    items: ["David Lee", "Emma Davis", "Frank Brown"],
  },
  {
    stage: "In Progress",
    count: 3,
    color: "#f59e0b",
    items: ["Grace Wilson", "Henry Taylor"],
  },
  {
    stage: "Completed",
    count: 8,
    color: "#8b5cf6",
    items: ["Ivan Moore", "Jane Anderson"],
  },
];

const statusColors: Record<string, string> = {
  "New Request": "#dbeafe",
  Confirmed: "#d1fae5",
  "In Progress": "#fef3c7",
  Completed: "#ede9fe",
};

export default function AppointmentPipeline() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Appointment Pipeline</h2>
        <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
          Total: 21
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pipeline.map((col) => (
          <div key={col.stage} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{col.stage}</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: col.color,
                  backgroundColor: statusColors[col.stage],
                }}
              >
                {col.count}
              </span>
            </div>
            <div className="space-y-2">
              {col.items.map((name) => (
                <div
                  key={name}
                  className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                    >
                      {name[0]}
                    </div>
                    <span className="truncate font-medium">{name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
