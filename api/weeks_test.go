package main

import (
	"testing"
	"time"
)

func date(t *testing.T, s string) time.Time {
	t.Helper()
	d, err := time.Parse(time.DateOnly, s)
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func TestStartOfWeek(t *testing.T) {
	tests := map[string]string{
		"2026-01-05": "2026-01-05", // Monday
		"2026-01-09": "2026-01-05", // Friday
		"2026-01-11": "2026-01-05", // Sunday
		"2026-01-01": "2025-12-29", // across the year boundary
	}
	for in, want := range tests {
		if got := startOfWeek(date(t, in)).Format(time.DateOnly); got != want {
			t.Errorf("startOfWeek(%s) = %s, want %s", in, got, want)
		}
	}
}

func TestWeekStarts(t *testing.T) {
	got := weekStarts(date(t, "2025-12-31"), date(t, "2026-01-12"))
	want := []string{"2025-12-29", "2026-01-05", "2026-01-12"}
	if len(got) != len(want) {
		t.Fatalf("got %d weeks, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i].Format(time.DateOnly) != want[i] {
			t.Errorf("week %d = %s, want %s", i, got[i].Format(time.DateOnly), want[i])
		}
	}
}
