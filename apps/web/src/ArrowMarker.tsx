/** Arrow head shared by every directed edge (`markerEnd="url(#arrow)"`). */
export function ArrowMarker() {
  return (
    <defs>
      <marker
        id="arrow"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
      >
        <path d="M0 0L10 5L0 10z" className="arrow" />
      </marker>
    </defs>
  );
}
