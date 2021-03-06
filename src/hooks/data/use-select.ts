import { useCallback, useEffect, useRef, useState } from 'react'

import { Count, Filter, PostgrestError } from '../../types'
import { useClient } from '../use-client'
import { initialState } from './state'

export type UseSelectState<Data = any> = {
    count?: number | null
    data?: Data[] | null
    error?: PostgrestError | null
    fetching: boolean
    stale: boolean
}

export type UseSelectResponse<Data = any> = [
    UseSelectState<Data>,
    () => Promise<Pick<
        UseSelectState<Data>,
        'count' | 'data' | 'error'
    > | null>,
]

export type UseSelectOptions = {
    count?: null | Count
    head?: boolean
}

export type UseSelectConfig<Data = any> = {
    columns?: string
    filter?: Filter<Data> | false | null
    options?: UseSelectOptions
    pause?: boolean
}

export function useSelect<Data = any>(
    table: string,
    config: UseSelectConfig<Data> = { columns: '*', options: {} },
): UseSelectResponse<Data> {
    const client = useClient()
    const isMounted = useRef(false)
    const [state, setState] = useState<UseSelectState>({
        ...initialState,
        stale: false,
    })

    const execute = useCallback(async () => {
        if (config.pause) return null
        setState((x) => ({
            ...initialState,
            data: x.data,
            stale: true,
            fetching: true,
        }))
        const source = client
            .from<Data>(table)
            .select(config.columns, config.options)
        const { count, data, error } = await (config.filter
            ? config.filter(source)
            : source)
        const res = { count, data, error }
        if (isMounted.current)
            setState({ ...res, stale: false, fetching: false })
        return res
    }, [client, config, table])

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        isMounted.current = true
        execute()
        return () => {
            isMounted.current = false
        }
    }, [config?.filter])
    /* eslint-enable react-hooks/exhaustive-deps */

    return [state, execute]
}
