package main

import (
	"testing"
	"time"
)

func TestParseWeekRange(t *testing.T) {
	tests := []struct {
		name, from, to   string
		wantFrom, wantTo string
		wantWeeks        int
		wantErr          bool
	}{
		{name: "whole weeks across the year boundary", from: "2025-12-29", to: "2026-01-16", wantFrom: "2025-12-29", wantTo: "2026-01-18", wantWeeks: 3},
		{name: "mid-week dates snap outwards", from: "2026-01-07", to: "2026-01-07", wantFrom: "2026-01-05", wantTo: "2026-01-11", wantWeeks: 1},
		{name: "sunday belongs to the preceding week", from: "2026-01-11", to: "2026-01-12", wantFrom: "2026-01-05", wantTo: "2026-01-18", wantWeeks: 2},
		{name: "exactly the maximum span", from: "2026-01-05", to: "2026-07-05", wantFrom: "2026-01-05", wantTo: "2026-07-05", wantWeeks: maxWeeks},
		{name: "over the maximum span", from: "2026-01-05", to: "2026-07-06", wantErr: true},
		{name: "reversed range", from: "2026-01-12", to: "2026-01-05", wantErr: true},
		{name: "missing to", from: "2026-01-05", wantErr: true},
		{name: "malformed date", from: "2026-1-5", to: "2026-01-12", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			from, to, err := parseWeekRange(tt.from, tt.to)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got %s..%s", from.Format(time.DateOnly), to.Format(time.DateOnly))
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := from.Format(time.DateOnly); got != tt.wantFrom {
				t.Errorf("from = %s, want %s", got, tt.wantFrom)
			}
			if got := to.Format(time.DateOnly); got != tt.wantTo {
				t.Errorf("to = %s, want %s", got, tt.wantTo)
			}
			if got := len(weekStarts(from, to)); got != tt.wantWeeks {
				t.Errorf("weeks = %d, want %d", got, tt.wantWeeks)
			}
		})
	}
}
