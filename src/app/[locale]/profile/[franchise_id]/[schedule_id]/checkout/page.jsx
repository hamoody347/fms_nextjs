'use client';

import axiosInstance from "@/axios";
import alert from '@/app/components/SweetAlerts';

import { useState, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import StudentSelection from "../../studentSelect";
import money from "@/app/localization/currency";
import MerchantGateWay from "@/app/components/payment_gateways/MerchantGateWay";


export default function ScheduleCheckout({ params: { franchise_id, schedule_id } }) {
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const { replace } = useRouter();
    const searchParams = useSearchParams();
    let studentIds = searchParams.get('id')?.split(',') ?? [];

    const [formData, setFormData] = useState({
        schedule: schedule_id, // Schedule ID
        franchise: franchise_id, // Franchise ID
        coupon: '', // Coupon Code
        useCredit: '', // Use Credit Checkbox
        paymentoption: '', // Payment Option
        students: [], // Array of students
        marketingagreed: false, // Marketing Checkbox
        minimumDeposit: false, // Minimum Payment Checkbox 
    });

    const [paymentCardSettings, setPaymentCardSettings] = useState({
        credit: 0,
        useCredit: false,
        useCoupon: false,
        enrollment: true,
        couponDiscount: 0,
        recurringPayment: false
    });

    const [coupon, setCoupon] = useState({});
    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState({});
    const [students, setStudents] = useState([]);
    const [totalCost, setTotalCost] = useState(0);
    const [couponCode, setCouponCode] = useState('');
    const [totalPayable, setTotalPayable] = useState(0);
    const [studentDetails, setStudentDetails] = useState([]);
    const [selectingStudents, setSelectingStudents] = useState(true);

    const validateCoupon = async () => {
        try {
            const { data } = await axiosInstance.get(`api/validateCoupon.php?id=${couponCode}&sid=${schedule_id}`);
            setCoupon(data?.coupon);
        } catch (err) {
            const { response } = err;
            console.log(response);
        }
    };

    const enroll = async () => {
        try {
            const obj = {
                ...formData,
                students: studentIds
            };
            const { data } = await axiosInstance.post(`api/checkout.php`, obj);
            alert({ type: "success", message: data?.message });
            router.push(`/profile/${franchise_id}`);
        } catch (err) {
            const { response } = err;
            alert({ type: "error", message: response?.data?.message });
        }
    }

    const handleChange = (e) => {
        const { name, type, value, checked } = e.target;

        const newValue = type === 'checkbox' ? checked : value;

        setFormData({ ...formData, [name]: newValue });
    };

    const selectStudents = (students, studentList = []) => {
        console.log(studentList);
        const params = new URLSearchParams(searchParams);
        params.set('id', Object.keys(students).join(','));
        studentIds = Object.keys(students);
        replace(`${pathname}?${params.toString()}`);

        setStudents(Object.values(students));
        calculatePayment();

        const closeBtn = document.getElementById('selectStudentClose');
        closeBtn.click();
        setStudentDetails(studentList);
        setTimeout(() => {
            setSelectingStudents(false);
        }, 500);
    }

    const calculatePayment = (cost = schedule.cost?.totalcost) => {
        let newTotalCost = cost * studentIds.length;
        if (!newTotalCost) {
            return;
        }

        if (formData?.minimumDeposit) {
            // Set the payment to minimum cost.
            // Show the remaining amount to be paid
            setPaymentCardSettings({ ...paymentCardSettings, useMinimum: true, minimuCost: schedule?.scheduleminimumdeposit });
        } else {
            setPaymentCardSettings({ ...paymentCardSettings, useMinimum: false });
        }

        if (coupon && formData?.paymentoption !== 'recurringPayments') {
            // Adjust price for coupon where paymentoption is not recurring payments.
            const discount = 0;
            setPaymentCardSettings({ ...paymentCardSettings, useCoupon: true, couponDiscount: discount });
            newTotalCost -= discount;
        } else {
            setPaymentCardSettings({ ...paymentCardSettings, useCoupon: false, couponDiscount: 0 });
        }

        if (formData?.useCredit && (formData?.paymentoption !== 'recurringPayments' || !schedule.schedulerecurringpaymentsautocharge)) {
            // adjust for credit
            const credittouse = schedule.creditAvailable;
            setPaymentCardSettings({ ...paymentCardSettings, useCredit: true, credit: credittouse });
            newTotalCost -= credittouse;
        } else {
            setPaymentCardSettings({ ...paymentCardSettings, useCredit: false, credit: 0 });
        }

        if (formData?.paymentoption == 'recurringPayments') {
            newTotalCost = schedule?.schedulerecurringpaymentsamount * studentIds.length;
            setPaymentCardSettings({ ...paymentCardSettings, recurringPayment: true, useMinimum: false });

        }

        setTotalCost(newTotalCost);
    }

    const toggleStudentSelection = () => {
        setSelectingStudents(true);
    }

    const fetchData = async () => {
        const url = `api/schedule.php?fid=${franchise_id}&id=${schedule_id}` + (studentIds ? `&sid=${studentIds.join(',')}` : '')
        try {
            const { data } = await axiosInstance.get(url);
            setSchedule(data?.schedule);
            setStudents(data?.students);
            if (data?.schedule?.availablespots <= 0) {
                alert({ type: "error", message: t(`Schedule (${data?.schedule?.name}) has no available spots.`) });
                router.push(`/profile/${franchise_id}`);
            }
            if (studentIds.length <= 0) {
                const btn = document.getElementById('selectStudents')
                btn.click();
            }
            calculatePayment(data?.schedule?.cost?.totalCost);
        } catch (err) {
            const { response } = err;
            console.log(response);
            router.push(`/profile/${franchise_id}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        calculatePayment();
    }, [coupon, formData])

    useEffect(() => {
        let total;

        if (!formData?.paymentoption)
            return;

        console.log(formData?.paymentoption);
        switch (formData?.paymentoption) {
            case "minimumDeposit":
                total = schedule?.scheduleminimumdeposit * studentIds.length;
                break;
            case "recurringPayments":
                total = schedule?.schedulerecurringpaymentsamount * studentIds.length;
                break;
            default:
                total = totalCost;
        }
        setTotalPayable(total);
    }, [formData, schedule, totalCost]);

    useEffect(() => {
        fetchData();
    }, []);

    return <>
        {loading && <div className="loading-overlay">
            <div className="spinner"></div>
        </div>}
        <section>
            <div className="padding-top mb-5">
                <div className="container mt-4">
                    <div className="row book-party">
                        <div className="col-lg-7">
                            <div className="mb-3">
                                <h6 className="font-bold text-grey">{t('Schedule')}</h6>
                            </div>
                            <div className="check-out">
                                <div className="checkout-item">
                                    <img
                                        alt="..."
                                        className="card-img"
                                        //TODO src={schedule.image ? schedule.image : "/assets/img/program-1.png"}
                                        src={"https://s3-us-west-2.amazonaws.com/bricks4kidz-files/files/64/19/WeLearnWeBuildWePlay.jpg"}
                                    />
                                    <div>
                                        <h6 className="font-bold mb-2">{schedule.name || 'N/A'}</h6>
                                        <p className="font-semibold text-13 mb-2">{schedule.daterange || 'N/A'}</p>
                                    </div>
                                    <div className="cost">
                                        <p className=" text-grey-200 font-semibold mb-2">{t('Schedule Cost')} : <span className=" font-bolder text-black">{money(schedule.cost?.totalcost) || 0}</span></p>
                                        <p className="font-semibold text-13 text-orange">{(schedule.availablespots || 0) + ' ' + t('Available Spots')}
                                        </p>
                                    </div>
                                </div>
                                <div className="details mt-2">
                                    <div className="items">
                                        <img src="/assets/img/pin-icon.svg" alt="..." />
                                        <p className="font-semibold text-13">{schedule.location || 'Location not specified'}</p>
                                    </div>
                                    <div className="items">
                                        <img src="/assets/img/teacher-icon.svg" alt="..." />
                                        <p className="font-semibold text-13">{(schedule.teachers?.length > 0 ? schedule.teachers.join(', ') : 'No teachers assigned')}</p>
                                    </div>
                                    <div className="items">
                                        <img alt="" src="/assets/img/pin-icon.svg" />
                                        <p className="font-semibold text-13 text-orange">
                                            {`${schedule.minage || 1} - ${schedule.maxage || 'N/A'} years`}
                                        </p>
                                    </div>
                                    <div className="items">
                                        <img src="/assets/img/clock-icon.svg" alt="..." />
                                        <div className="days flexed">
                                            {schedule.days?.length === 7
                                                ? <p className="font-semibold text-13">{t('All Week')}</p>
                                                : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                                                    schedule.days?.includes(day) ? (<span
                                                        key={day}
                                                    >
                                                        {day.slice(0, 2).toUpperCase()}
                                                    </span>) : (<p
                                                        key={day}
                                                    >
                                                        {day.slice(0, 2).toUpperCase()}
                                                    </p>)
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="line" />
                            <div className="mb-3 d-flex justify-content-between align-items-center">
                                <p className="fs-6 font-bold text-grey">{t('Students to enroll')}</p>
                                <span id="selectStudents" data-bs-toggle="modal" data-bs-target="#select-student" className="fs-6 font-bold text-blue cursor-pointer" onClick={toggleStudentSelection}><i className="mdi mdi-pencil"></i> {('Update Students')}</span>
                            </div>
                            {
                                students?.map((student) => {
                                    return <div className="flexed mb-3" key={student.studentid}>
                                        <p className=" text-grey-200 font-semibold">{`${t('Student')}: `}
                                            <span className=" text-black">{student.studentname}</span>
                                        </p>
                                    </div>
                                })
                            }
                            <div className="line" />
                            <div className="mb-3">
                                <h6 className="font-bold text-grey">{t('Payment Options')}</h6>
                            </div>
                            <div className="radio-group">

                                {true ? <div className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="paymentoption"
                                        id="online"
                                        value="online"
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="online">{t('Pay In Full')}</label>
                                </div> : ''}

                                {schedule.scheduleuseminimumdeposit ? <div className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="paymentoption"
                                        id="minimumDeposit"
                                        value="minimumDeposit"
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="minimumDeposit">{`${t('Pay')} ${money(schedule.scheduleminimumdeposit * studentIds.length)} Now`}</label>
                                </div> : ''}

                                {true ? <div className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="paymentoption"
                                        id="cash"
                                        value="cash"
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="cash">{t('Cash / Cheque')}</label>
                                </div> : ''}

                                {schedule.schedulerecurringpayments !== 0 ? <div className="form-check form-check-inline">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="paymentoption"
                                        id="recurringPayments"
                                        value="recurringPayments"
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="recurringPayments"> {`${schedule.schedulerecurringpaymentsnum} ${t(schedule.schedulerecurringpaymentsfrequency)} ${t('Payments')} @ ${money(schedule.schedulerecurringpaymentsamount * studentIds.length)}`}</label>
                                </div> : ''}
                            </div>

                            <div className="check-group mt-2">
                                {(schedule.creditAvailable > 0 && (formData?.paymentoption !== 'recurringPayments' || !schedule.schedulerecurringpaymentsautocharge)) ? (
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            name="useCredit"
                                            type="checkbox"
                                            id="useCredit"
                                            checked={formData?.useCredit || false}
                                            onChange={handleChange}  // Handle the change
                                        />
                                        <label className="form-check-label" htmlFor="useCredit">
                                            {`${t('Use Credit')} (${schedule.creditAvailable})`}
                                        </label>
                                    </div>
                                ) : ''}
                            </div>

                            <div className="line" />
                            <div className="mb-1">
                                <h6 className="font-bold text-grey">{t('Our Policies')}</h6>
                            </div>
                            <div className="check-group">
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" defaultValue id="flexCheckDefault" />
                                    <label className="form-check-label" htmlFor="flexCheckDefault">
                                        {t('I accept Refund')} <a href="#" className="text-13 text-blue">{t('Policy')}</a>
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" defaultValue id="flexCheckChecked" />
                                    <label className="form-check-label" htmlFor="flexCheckChecked">
                                        {t('I accept Cancellation')} <a href="#" className="text-13 text-blue">{t('Policy')}</a>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-5">
                            <div className="coupon mb-4">
                                {formData?.paymentoption !== 'recurringPayments' ? <>
                                    <input type="text" className="input-style1" placeholder="Have coupon code ? Enter here" onChange={(e) => setCouponCode(e.target.value)} />
                                    <button className="apply-btn" onClick={validateCoupon}>{t('Apply')}</button>
                                </> : ''}
                            </div>
                            <div className="card cart-card">
                                <div className="middle-section pt-1 pb-3">
                                    <h6 className="text-grey font-bold mb-3">{t('Payment Summary')}</h6>
                                    <div className="row">
                                        <div className="col text-start">
                                            <p className="text-grey-200  font-semibold">{t('Schedule Cost')}</p>
                                        </div>
                                        <div className="col text-center">
                                            <p className="text-black font-semibold">{`${money(schedule.cost?.basecost)} x ${studentIds.length}`}</p>
                                        </div>
                                        <div className="col text-end">
                                            <p className="text-grey-200  font-semibold"> <span className=" text-black font-bold">{money(schedule.cost?.basecost * studentIds.length) || money(0)}</span></p>
                                        </div>
                                    </div>
                                </div>
                                {schedule.addons && Object.values(schedule?.addons).map((addon, i) => {
                                    return (<div className="middle-section pt-3 pb-3" key={i}>
                                        <div className="row">
                                            <div className="col text-start">
                                                <p className="text-grey-200  font-semibold">{`${addon.programaddonname || 'Addon Name'} ${addon.scheduleprogramaddonqty > 1 ? `X ${addon.scheduleprogramaddonqty}` : ''}`}</p>
                                            </div>
                                            <div className="col text-center">
                                                <p className="text-black font-semibold">{`${money(addon.programaddonamount * addon.scheduleprogramaddonqty)} x ${studentIds.length}`}</p>
                                            </div>
                                            <div className="col text-end">
                                                <p className="text-grey-200  font-semibold"> <span className=" text-black font-bold">{money(addon.programaddonamount * addon.scheduleprogramaddonqty * studentIds.length)}</span></p>
                                            </div>
                                        </div>
                                    </div>);
                                })}
                                {(paymentCardSettings.useCoupon) ? <div className="middle-section pt-3 pb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div >
                                            <p className="text-grey-200  font-semibold">{t('Coupon Applied')}</p>
                                        </div>
                                        <div>
                                            <p className="text-grey-200  font-semibold"> <span className=" text-green font-bold">- {money(paymentCardSettings.couponDiscount)}</span></p>
                                        </div>
                                    </div>
                                </div> : ''}
                                {paymentCardSettings.useCredit ? <div className="middle-section pt-3 pb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p className="text-grey-200  font-semibold">{t('Credit Applied')}</p>
                                        </div>
                                        <div>
                                            <p className="text-grey-200  font-semibold"> <span className=" text-green font-bold">- {money(paymentCardSettings.credit)}</span></p>
                                        </div>
                                    </div>
                                </div> : ''}
                                <div className="bottom-section pt-3 pb-2">
                                    <div className="d-flex justify-content-between align-items-center px-4">
                                        <div>
                                            <p className="text-grey-200 fs-5 font-semibold">{t('Total Amount')} </p>
                                        </div>
                                        <div>
                                            <p className="text-grey-200 fs-5 font-semibold"> <span className=" text-black font-bold">{money(totalCost)}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex gap-2 flex-column">
                                {formData?.paymentoption !== 'cash' ? <p className="fs-4 font-semi-bold text-black">{`${t('Due Now: ')} ${money(totalPayable) || 0}`}</p> : ''}
                                {(formData['paymentoption'] && formData['paymentoption'] != 'cash') ? <MerchantGateWay merchant_id={franchise_id} paymentData={{ ...formData, students: studentIds }} /> : ''}
                                {(formData['paymentoption'] == 'cash') ? <button className="btn btn-outline-success btn-lg w-100" onClick={enroll}>{t('Enroll Now')}</button> : ""}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <div className="modal fade" id="select-student" aria-hidden="true" data-bs-backdrop={studentIds?.length > 0 ? "true" : "static"} data-bs-keyboard={studentIds?.length > 0 ? "true" : "false"}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                <div className="modal-content">
                    <div className="modal-header border-0 d-flex justify-content-between align-items-center pb-0">
                        <p className="font-bold text-blue fs-5" id="modalLabel">{t('Select students to enroll.')}</p>
                        <i className={`mdi mdi-close-circle text-red fs-5 cursor-pointer ${studentIds?.length > 0 ? '' : ' d-none'}`} id="selectStudentClose" data-bs-dismiss="modal" aria-label="Close"></i>
                    </div>
                    <div className="modal-body">
                        <StudentSelection key={selectingStudents ? 'SS' : 'NSS'} passedStudents={studentIds} studentDetails={studentDetails} schedule_id={schedule_id} buttonAction={selectStudents} />
                    </div>
                </div>
            </div>
        </div>
    </>;
}