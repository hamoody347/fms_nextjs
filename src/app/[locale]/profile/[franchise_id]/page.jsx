"use client";

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

import axiosInstance from "@/axios";
import ScheduleCard from "./scheduleCard";
import SocialIcons from '@/app/components/SocialIcons';
import AuthService from "@/auth.service";
import MultiRangeSlider from "@/app/components/DualSlider";

export default function FranchiseProfile({ params: { franchise_id } }) {

    const { t } = useTranslation();

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const router = useRouter();

    const [clear, setClear] = useState(false);
    const [loading, setLoading] = useState(true);
    const [programs, setPrograms] = useState([]);
    const [ageRange, setAgeRange] = useState({});
    const [locations, setLocations] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [franchise, setFranchise] = useState(null);
    const [filteredSchedules, setFilteredSchedules] = useState([]);

    const [filterData, setFilterData] = useState({
        locations: [],
        programs: [],
        date: {
            start: '',
            end: ''
        },
        age: {
            min: 1,
            max: 16
        }
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axiosInstance.get(`api/profile.php?id=${franchise_id}`);
                // console.log(response.data?.ageRange);
                setPrograms(response.data?.programs || []);
                setLocations(response.data?.locations || []);
                setAgeRange(response.data?.ageRange || { min: 1, max: 16 });
                setFilterData({ ...filterData, age: response.data?.ageRange });
                setSchedules(response.data?.schedules || []);
                setFranchise(response.data?.franchise);
                setFilteredSchedules(response.data?.schedules || []);
            } catch (err) {
                console.log(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []); // Fetch data once on mount


    useEffect(() => {
        // Filter schedules whenever schedules or searchParams change
        setFilteredSchedules(filterSchedules());
    }, [schedules, searchParams]);

    function locationFilter(locationId) {
        const params = new URLSearchParams(searchParams);
        if (locationId) {
            params.set('location', locationId);
        } else {
            params.delete('location');
        }
        const currentScrollY = window.scrollY;
        replace(`${pathname}?${params.toString()}`);
        setTimeout(() => {
            window.scrollTo(0, currentScrollY);
        }, 500);
    }

    function programFilter(programId) {
        const params = new URLSearchParams(searchParams);
        if (programId) {
            params.set('program', programId);
        } else {
            params.delete('program');
        }
        const currentScrollY = window.scrollY;
        replace(`${pathname}?${params.toString()}`);
        setTimeout(() => {
            window.scrollTo(0, currentScrollY);
        }, 500);
    }

    function filterSchedules() {
        const programId = searchParams.get('program');
        const locationId = searchParams.get('location');

        return schedules.filter((ele) =>
            (programId ? ele['programid'] === programId : true) &&
            (locationId ? ele['locationid'] === locationId : true)
        );
    }

    function silderChange(min = 0, max = 0) {
        // console.log(min, max, 'pre')
        if (max == 0)
            return;

        // console.log(
        //     { min: min, max: max }
        // )
        setFilterData({
            ...filterData, age: {
                min: min,
                max: max
            }
        });
    }

    const enroll = (scheduleid) => {
        if (AuthService.isAuthenticated()) {
            router.push(`/profile/${franchise_id}/${scheduleid}/checkout`)
        }
    }

    const handleFilterChange = (type, value, checked) => {
        setFilterData((prev) => {
            if (type === 'programs' || type === 'locations') {
                // Handle checkbox selection for programs and locations
                const updatedFilter = checked
                    ? [...prev[type], value]
                    : prev[type].filter((item) => item !== value);
                return { ...prev, [type]: updatedFilter };
            } else if (type === 'date') {
                // Handle date changes (start or end)
                return {
                    ...prev,
                    date: {
                        ...prev.date,
                        [value.name]: value.value
                    }
                };
            } else if (type === 'age') {
                // Handle age range change (min or max)
                return {
                    ...prev,
                    age: {
                        ...prev.age,
                        [value.type]: value.value
                    }
                };
            }
            return prev;
        });
    };

    const applyFilters = () => {
        console.log(filterData, 'filterdata');
        console.log(schedules);
        const filteredSchedules = schedules.filter((schedule) => {
            const programMatch = filterData.programs.length === 0 || filterData.programs.includes(schedule.programid);
            const locationMatch = filterData.locations.length === 0 || filterData.locations.includes(schedule.locationid);
            const dateMatch = (!filterData.date.start || schedule.startdate >= filterData.date.start) &&
                (!filterData.date.end || schedule.enddate <= filterData.date.end);
            const ageMatch = schedule.minage >= filterData.age.min && schedule.maxage <= filterData.age.max;

            return programMatch && locationMatch && dateMatch && ageMatch;
        });

        console.log('Filtered Schedules:', filteredSchedules);
        setFilteredSchedules(filteredSchedules);
    };

    const clearFilters = () => {
        setFilteredSchedules(schedules);
        setFilterData({
            locations: [],
            programs: [],
            date: {
                start: '',
                end: ''
            },
            age: {
                min: ageRange['min'],
                max: ageRange['max']
            }
        });
        setClear(true);
        setTimeout(() => {
            setClear(false);
        }, 1)
    }


    return (
        <div className="program-cards p-0">
            {loading && <div className="loading-overlay">
                <div className="spinner"></div>
            </div>}

            <section>
                <div
                    className="banner"
                    style={{
                        backgroundImage: 'url(/assets/img/banner.png)'
                    }}
                >
                </div>
            </section>
            <section>
                <div className="container">
                    <div className="row">
                        <div className="col-12 company-details p-5" style={{ borderRadius: '0' }}>
                            <div className="container">
                                <div className="row">
                                    <div className="col-md col-sm-12 align-items-md-start align-items-center ps-md-0">
                                        <div className="text-md-start text-center font-bold fs-3 pb-1">{`Bricks 4 Kidz - ${franchise?.displayname}`}</div>
                                        <div className="text-md-start text-center font-semibold fs-5 pb-1">{franchise?.name}</div>
                                        <div className="text-md-start text-center fs-5">{franchise?.phone}</div>
                                    </div>
                                    <div className="col-md col-sm-12 d-flex justify-content-center flex-column align-items-md-end align-items-center">
                                        <div className="row details d-block py-4">
                                            <button className='btn btn-sm btn-outline-primary w-25 me-3' style={{ minWidth: 'fit-content' }}>
                                                <img
                                                    className='me-2'
                                                    alt=""
                                                    src="/assets/img/call-icon.svg"
                                                />
                                                {t('Email Us')}
                                            </button>
                                            <a href={franchise?.website ? `https://${franchise['website']}` : "#"} target="_blank" className='btn btn-sm btn-outline-primary w-25' style={{ minWidth: 'fit-content' }}>
                                                <img
                                                    className='me-2'
                                                    alt=""
                                                    src="/assets/img/call-icon.svg"
                                                />
                                                {t('Visit Our Website')}
                                            </a>
                                        </div>

                                        <div className="row d-block social-icons">
                                            {franchise?.twitter && <SocialIcons icon="x" href={franchise['twitter']}></SocialIcons>}
                                            {franchise?.youtube && <SocialIcons icon="youtube" href={franchise['youtube']}></SocialIcons>}
                                            {franchise?.facebook && <SocialIcons icon="facebook" href={franchise['facebook']}></SocialIcons>}
                                            {franchise?.linkedin && <SocialIcons icon="linkedin" href={franchise['linkedin']}></SocialIcons>}
                                            {franchise?.whatsapp && <SocialIcons icon="whatsapp" href={franchise['whatsapp']}></SocialIcons>}
                                            {franchise?.instagram && <SocialIcons icon="instagram" href={franchise['instagram']}></SocialIcons>}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 w-75" style={{ borderTop: "1px solid rgb(0,0,0, 0.1)", margin: "auto" }}></div>
                                {/* <div className="row mt-4 franchise-description"> */}
                                <div className="row mt-4">
                                    {franchise?.description}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section>
                <div className="programs">
                    <div className="section-title d-none">
                        <div className="container">
                            <div className="row">
                                <div className="col-lg-5 m-auto">
                                    <h4 className="font-bold">
                                        {t('Scheduled Programs')}
                                    </h4>
                                </div>
                                <div className="col-lg-7 my-auto">
                                    <div className="select-group">
                                        <select
                                            className="right wide"
                                            onChange={(e) => programFilter(e.target.value)}
                                            value={searchParams.get('program') || ''}
                                        >
                                            <option value="">{t('Filter By Program')}</option>
                                            {programs?.map((ele) => (
                                                <option value={ele.id} key={ele.id}>{ele.name}</option>
                                            ))}
                                        </select>

                                        <select
                                            className="right wide"
                                            onChange={(e) => locationFilter(e.target.value)}
                                            value={searchParams.get('location') || ''}
                                        >
                                            <option value="">{t('Filter By Location')}</option>
                                            {locations?.map((ele) => (
                                                <option value={ele.id} key={ele.id}>{ele.name}</option>
                                            ))}
                                        </select>

                                        {/* <div className="calender">
                                            <img
                                                alt=""
                                                className="cursor-pointer"
                                                src="/assets/img/calender-icon.png"
                                            />
                                        </div> */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="program-cards">
                        <div className="container">
                            <div className="row">
                                <div className="col-md-3 d-none d-lg-block card rounded-0 mb-2">
                                    <div className="text-primary fw-bold mb-2">{t('Programs')}</div>
                                    <div className="checkbox-group">
                                        {
                                            programs?.map((ele, index) => (
                                                <div className="form-check" key={index}>
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        value={ele.id}
                                                        id={`programCheck-${index}`}
                                                        checked={filterData['programs'].includes(ele.id)}
                                                        onChange={(e) => handleFilterChange('programs', e.target.value, e.target.checked)}
                                                    />
                                                    <label className="form-check-label" htmlFor={`programCheck-${index}`}>
                                                        {ele.name}
                                                    </label>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <hr className="my-3 m-auto w-75 text-center" />
                                    <div className="text-primary fw-bold mb-2">{t('Locations')}</div>
                                    <div className="checkbox-group">
                                        {
                                            locations?.map((ele, index) => (
                                                <div className="form-check" key={index}>
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        value={ele.id}
                                                        id={`locationCheck-${index}`}
                                                        checked={filterData['locations'].includes(ele.id)}
                                                        onChange={(e) => handleFilterChange('locations', e.target.value, e.target.checked)}
                                                    />
                                                    <label className="form-check-label" htmlFor={`locationCheck-${index}`}>
                                                        {ele.name}
                                                    </label>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <hr className="my-3 m-auto w-75 text-center" />
                                    <div className="text-primary fw-bold mb-2">{t('Date')}</div>
                                    <div className="title2">
                                        <div className="dates d-flex gap-2 align-items-start">
                                            <div className="d-flex flex-column justify-content-start gap-1 align-items-start">
                                                <label className="text-grey-200">{t('Start')}</label>
                                                <input
                                                    type="date"
                                                    name="start"
                                                    className="rounded-0 p-1"
                                                    value={filterData['date']['start'] ?? ''}
                                                    onChange={(e) => handleFilterChange('date', { name: 'start', value: e.target.value })}
                                                />
                                            </div>
                                            <div className="d-flex flex-column justify-content-start gap-1 align-items-start">
                                                <label className="text-grey-200">{t('End')}</label>
                                                <input
                                                    type="date"
                                                    name="end"
                                                    value={filterData['date']['end'] ?? ''}
                                                    className="rounded-0 p-1"
                                                    onChange={(e) => handleFilterChange('date', { name: 'end', value: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="my-3 m-auto w-75 text-center" />
                                    <div className="text-primary fw-bold mb-2">{t('Age')}</div>

                                    <div className="d-flex justify-content-center align-items-center gap-2">
                                        <div>{filterData.age.min}</div>
                                        {(ageRange['min'] && !clear) && <MultiRangeSlider
                                            min={ageRange['min']}
                                            max={ageRange['max']}
                                            changeFunction={silderChange}
                                        />}
                                        <div>{filterData.age.max}</div>
                                    </div>

                                    <hr className="my-3" />
                                    <div className="d-flex gap-2">
                                        <button
                                            className="btn btn-primary fw-bold w-100"
                                            onClick={applyFilters}
                                        >
                                            {t('Apply Filters')}
                                        </button>
                                        <button className="btn btn-danger fw-bold" onClick={clearFilters}>{t('Clear')}</button>
                                    </div>
                                </div>
                                <div className="col-12 col-lg-9 pe-0 overflow-y-auto max-vh-75" style={{ maxHeight: '550px' }}>
                                    {filteredSchedules.length > 0 ? filteredSchedules?.map(function (schedule) {
                                        return (
                                            (schedule.availablespots > 0) ? <ScheduleCard franchise_id={franchise_id} schedule={schedule} buttonAction={enroll} key={schedule.id} /> : ''
                                        );
                                    }) : <div className="fs-4 text-white">{t('No Available Schedules')}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section >
            <section>
                <div className="bg-images">
                    <div className="party">
                        <div className="text-center">
                            <p className="text-white font-semibold">
                                {
                                    t('Looking for something different than the old run of the mill birthday parties? Why not have a Bricks 4 Kidz® birthday party?')
                                }
                            </p>
                            <a href="party.html">
                                <button className="btn-style2 red mt-5">
                                    {t('Birthday party Request')}
                                </button>
                            </a>
                        </div>
                    </div>
                    <div className="teacher">
                        <div className="text-center">
                            <p className="text-white font-semibold">
                                {
                                    t('Looking for tech, we are hiring, join us and build a creativity community with fun We Learn, We Build, We Play with LEGO® Bricks')
                                }
                            </p>
                            <a href="apply-teacher.html">
                                <button className="btn-style2 blue mt-5">
                                    {t('Apply For Teacher')}
                                </button>
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div >
    );
};
