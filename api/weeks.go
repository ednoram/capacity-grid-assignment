package main

import "time"

func startOfWeek(d time.Time) time.Time {
	daysSinceMonday := (int(d.Weekday()) + 6) % 7
	return d.AddDate(0, 0, -daysSinceMonday)
}

func weekStarts(from, to time.Time) []time.Time {
	var weeks []time.Time
	for d := startOfWeek(from); !d.After(to); d = d.AddDate(0, 0, 7) {
		weeks = append(weeks, d)
	}
	return weeks
}
