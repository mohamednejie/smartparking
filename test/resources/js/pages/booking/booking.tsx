import React from "react";
import { Head, useForm } from "@inertiajs/react";

interface Parking {
    id: number;
    name: string;
    address_label?: string;
    price_per_hour: number;
    available_spots: number;
    photo_url?: string;
}

interface Props {
    parking: Parking;
}

export default function Booking({ parking }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        hours: 1,
        vehicle_number: "",
        start_time: "",
    });

    const totalPrice = data.hours * parking.price_per_hour;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/bookings/store/${parking.id}`);
    };

    return (
        <>
            <Head title={`Booking - ${parking.name}`} />

            <div className="min-h-screen bg-gray-100 py-10 px-4">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">

                    {/* LEFT SIDE - PARKING DETAILS */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        {parking.photo_url && (
                            <img
                                src={parking.photo_url}
                                alt={parking.name}
                                className="w-full h-64 object-cover"
                            />
                        )}

                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-2">
                                {parking.name}
                            </h2>

                            {parking.address_label && (
                                <p className="text-gray-600 mb-3">
                                    📍 {parking.address_label}
                                </p>
                            )}

                            <div className="space-y-2">
                                <p>
                                    💰 Price per hour:{" "}
                                    <span className="font-semibold text-blue-600">
                                        {parking.price_per_hour} DT
                                    </span>
                                </p>

                                <p>
                                    🚗 Available spots:{" "}
                                    <span className="font-semibold">
                                        {parking.available_spots}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE - BOOKING FORM */}
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h2 className="text-xl font-bold mb-6">
                            Reserve Your Spot
                        </h2>

                        <form onSubmit={submit} className="space-y-5">

                            {/* Vehicle number */}
                            <div>
                                <label className="block mb-2 font-medium">
                                    Vehicle Number
                                </label>
                                <input
                                    type="text"
                                    value={data.vehicle_number}
                                    onChange={(e) =>
                                        setData("vehicle_number", e.target.value)
                                    }
                                    className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                                />
                                {errors.vehicle_number && (
                                    <div className="text-red-500 text-sm mt-1">
                                        {errors.vehicle_number}
                                    </div>
                                )}
                            </div>

                            {/* Start time */}
                            <div>
                                <label className="block mb-2 font-medium">
                                    Start Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={data.start_time}
                                    onChange={(e) =>
                                        setData("start_time", e.target.value)
                                    }
                                    className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                                />
                                {errors.start_time && (
                                    <div className="text-red-500 text-sm mt-1">
                                        {errors.start_time}
                                    </div>
                                )}
                            </div>

                            {/* Hours */}
                            <div>
                                <label className="block mb-2 font-medium">
                                    Duration (hours)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={data.hours}
                                    onChange={(e) =>
                                        setData("hours", Number(e.target.value))
                                    }
                                    className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
                                />
                                {errors.hours && (
                                    <div className="text-red-500 text-sm mt-1">
                                        {errors.hours}
                                    </div>
                                )}
                            </div>

                            {/* Total price */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-lg">
                                    🧾 Total Price:
                                    <span className="font-bold text-green-600 ml-2">
                                        {totalPrice.toFixed(2)} DT
                                    </span>
                                </p>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-200"
                            >
                                {processing ? "Processing..." : "Confirm Booking"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}